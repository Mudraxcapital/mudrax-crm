package expo.modules.mudraxcalllog

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import androidx.core.content.edit
import androidx.documentfile.provider.DocumentFile
import java.io.File
import java.io.FileOutputStream

/**
 * TeleCRM-style call recording: the system dialer (Samsung / ODialer) records
 * the call; Mudrax imports the newest matching audio file into app storage.
 */
internal object DialerRecordingSync {
  private const val PREFS = "mudrax_dialer_recording"
  private const val KEY_TREE_URI = "tree_uri"
  private const val KEY_DISPLAY = "display_name"
  private const val MAX_SCAN_DEPTH = 3
  private const val MAX_FILES = 400

  private val AUDIO_EXTENSIONS =
    setOf("m4a", "amr", "mp3", "wav", "3gp", "aac", "ogg", "m4b", "mp4")

  fun prefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  fun folderSnapshot(context: Context): Map<String, Any?> {
    val uri = prefs(context).getString(KEY_TREE_URI, null)
    val display = prefs(context).getString(KEY_DISPLAY, null)
    val usable =
      if (uri.isNullOrBlank()) {
        false
      } else {
        runCatching {
          val tree = DocumentFile.fromTreeUri(context, Uri.parse(uri))
          tree != null && tree.exists() && tree.canRead()
        }.getOrDefault(false)
      }
    return mapOf(
      "configured" to (uri != null && usable),
      "treeUri" to uri,
      "displayName" to (display ?: uri?.let { friendlyTreeLabel(it) }),
    )
  }

  fun clearFolder(context: Context): Map<String, Any?> {
    val existing = prefs(context).getString(KEY_TREE_URI, null)
    if (!existing.isNullOrBlank()) {
      runCatching {
        context.contentResolver.releasePersistableUriPermission(
          Uri.parse(existing),
          Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )
      }
    }
    prefs(context).edit {
      remove(KEY_TREE_URI)
      remove(KEY_DISPLAY)
    }
    return folderSnapshot(context)
  }

  fun persistFolderFromResult(context: Context, data: Intent?): Map<String, Any?> {
    val uri = data?.data ?: return folderSnapshot(context).toMutableMap().apply {
      put("configured", false)
      put("error", "No folder was selected.")
    }

    val flags =
      data.flags and
        (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    runCatching {
      context.contentResolver.takePersistableUriPermission(
        uri,
        flags or Intent.FLAG_GRANT_READ_URI_PERMISSION,
      )
    }

    val tree = DocumentFile.fromTreeUri(context, uri)
    val display = tree?.name ?: friendlyTreeLabel(uri.toString())
    prefs(context).edit {
      putString(KEY_TREE_URI, uri.toString())
      putString(KEY_DISPLAY, display)
    }
    return folderSnapshot(context)
  }

  fun createPickIntent(): Intent {
    return Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
      addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        putExtra(DocumentsContract.EXTRA_INITIAL_URI, MediaStore.Audio.Media.EXTERNAL_CONTENT_URI)
      }
    }
  }

  /**
   * Find a dialer-produced recording for [phoneDigits] near the verified call
   * window and copy it into the app's call-recordings directory.
   */
  fun findAndImport(
    context: Context,
    phoneDigits: String,
    callStartedAtMs: Long,
    durationSeconds: Int,
  ): Map<String, Any?> {
    val digits = phoneDigits.filter { it.isDigit() }
    val started = callStartedAtMs.coerceAtLeast(0L)
    val durationMs = durationSeconds.coerceAtLeast(0).toLong() * 1000L
    val ended = started + durationMs
    val windowStart = started - 90_000L
    val windowEnd = ended + 180_000L

    val candidates = ArrayList<Candidate>()
    collectFromTree(context, windowStart, windowEnd, candidates)
    collectFromMediaStore(context, windowStart, windowEnd, candidates)

    if (candidates.isEmpty()) {
      return failureSnapshot(
        digits,
        "No dialer recording found yet. Enable Record all calls in Samsung Phone or ODialer, then set the recording folder in Mudrax.",
      )
    }

    val best =
      candidates
        .map { it to score(it, digits, started, ended, windowStart, windowEnd) }
        .filter { it.second > 0 }
        .maxByOrNull { it.second }
        ?.first

    if (best == null) {
      return failureSnapshot(
        digits,
        "Found audio files, but none matched this call number/time. Check the Media Path folder.",
      )
    }

    return try {
      val imported = copyToAppStorage(context, best)
      val durationSec =
        if (durationSeconds > 0) {
          durationSeconds
        } else {
          ((best.lastModifiedMs - started).coerceAtLeast(0L) / 1000L).toInt()
        }
      mapOf(
        "state" to "completed",
        "armed" to false,
        "recording" to false,
        "filePath" to imported.absolutePath,
        "storageReference" to "android-local://call-recordings/${imported.name}",
        "startedAtMs" to started.toDouble(),
        "endedAtMs" to
          (if (ended > started) ended else best.lastModifiedMs).toDouble(),
        "durationSeconds" to durationSec.coerceAtLeast(0),
        "audioSource" to "DIALER_FILE",
        "phoneDigits" to digits,
        "error" to null,
        "sourceFileName" to best.displayName,
      )
    } catch (error: Exception) {
      failureSnapshot(
        digits,
        error.message ?: "Could not import the dialer recording file.",
      )
    }
  }

  private fun failureSnapshot(digits: String, message: String): Map<String, Any?> {
    return mapOf(
      "state" to "failed",
      "armed" to false,
      "recording" to false,
      "filePath" to null,
      "storageReference" to null,
      "startedAtMs" to 0.0,
      "endedAtMs" to 0.0,
      "durationSeconds" to 0,
      "audioSource" to "DIALER_FILE",
      "phoneDigits" to digits,
      "error" to message,
      "sourceFileName" to null,
    )
  }

  private fun collectFromTree(
    context: Context,
    windowStart: Long,
    windowEnd: Long,
    out: MutableList<Candidate>,
  ) {
    val uriString = prefs(context).getString(KEY_TREE_URI, null) ?: return
    val root = DocumentFile.fromTreeUri(context, Uri.parse(uriString)) ?: return
    if (!root.exists() || !root.canRead()) return
    walkDocuments(root, 0, windowStart, windowEnd, out)
  }

  private fun walkDocuments(
    dir: DocumentFile,
    depth: Int,
    windowStart: Long,
    windowEnd: Long,
    out: MutableList<Candidate>,
  ) {
    if (depth > MAX_SCAN_DEPTH || out.size >= MAX_FILES) return
    val children = dir.listFiles()
    for (child in children) {
      if (out.size >= MAX_FILES) return
      if (child.isDirectory) {
        walkDocuments(child, depth + 1, windowStart, windowEnd, out)
        continue
      }
      if (!child.isFile) continue
      val name = child.name ?: continue
      if (!isAudioFileName(name)) continue
      val modified = child.lastModified()
      // Keep near-window files; also keep number-looking files slightly outside.
      if (modified > 0L && (modified < windowStart - 300_000L || modified > windowEnd + 300_000L)) {
        continue
      }
      val uri = child.uri
      out.add(
        Candidate(
          displayName = name,
          lastModifiedMs = if (modified > 0L) modified else System.currentTimeMillis(),
          sizeBytes = child.length(),
          open = { ctx -> ctx.contentResolver.openInputStream(uri) },
        ),
      )
    }
  }

  private fun collectFromMediaStore(
    context: Context,
    windowStart: Long,
    windowEnd: Long,
    out: MutableList<Candidate>,
  ) {
    if (out.size >= MAX_FILES) return
    val resolver = context.contentResolver
    val collection =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
      } else {
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      }

    val projection =
      arrayOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.DISPLAY_NAME,
        MediaStore.Audio.Media.DATE_MODIFIED,
        MediaStore.Audio.Media.DATE_ADDED,
        MediaStore.Audio.Media.SIZE,
        MediaStore.Audio.Media.RELATIVE_PATH,
      )

    val startSec = (windowStart / 1000L).coerceAtLeast(0L)
    val endSec = (windowEnd / 1000L).coerceAtLeast(startSec)
    val selection =
      "(${MediaStore.Audio.Media.DATE_MODIFIED} BETWEEN ? AND ? OR ${MediaStore.Audio.Media.DATE_ADDED} BETWEEN ? AND ?)"
    val args = arrayOf(startSec.toString(), endSec.toString(), startSec.toString(), endSec.toString())

    runCatching {
      resolver.query(
        collection,
        projection,
        selection,
        args,
        "${MediaStore.Audio.Media.DATE_MODIFIED} DESC",
      )?.use { cursor ->
        val idIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val nameIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
        val modIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
        val addIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
        val sizeIdx = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
        val pathIdx = cursor.getColumnIndex(MediaStore.Audio.Media.RELATIVE_PATH)

        while (cursor.moveToNext()) {
          if (out.size >= MAX_FILES) break
          val name = cursor.getString(nameIdx) ?: continue
          if (!isAudioFileName(name)) continue
          val relative = if (pathIdx >= 0) cursor.getString(pathIdx).orEmpty() else ""
          // Prefer call-recorder looking paths, but still accept others in window.
          val looksLikeCall =
            relative.contains("call", ignoreCase = true) ||
              name.contains("call", ignoreCase = true) ||
              relative.contains("record", ignoreCase = true)
          val modSec = cursor.getLong(modIdx)
          val addSec = cursor.getLong(addIdx)
          val modifiedMs = (if (modSec > 0L) modSec else addSec) * 1000L
          val id = cursor.getLong(idIdx)
          val uri =
            Uri.withAppendedPath(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id.toString())
          val size = cursor.getLong(sizeIdx)
          out.add(
            Candidate(
              displayName = name,
              lastModifiedMs = modifiedMs,
              sizeBytes = size,
              open = { ctx -> ctx.contentResolver.openInputStream(uri) },
              boost = if (looksLikeCall) 20 else 0,
            ),
          )
        }
      }
    }
  }

  private fun score(
    candidate: Candidate,
    phoneDigits: String,
    callStarted: Long,
    callEnded: Long,
    windowStart: Long,
    windowEnd: Long,
  ): Int {
    if (candidate.sizeBytes <= 0L) return 0
    val nameDigits = candidate.displayName.filter { it.isDigit() }
    var score = candidate.boost

    val suffixes =
      listOf(10, 8, 7)
        .map { n -> phoneDigits.takeLast(minOf(n, phoneDigits.length)) }
        .filter { it.length >= 7 }
        .distinct()

    val numberMatch =
      suffixes.any { suffix ->
        nameDigits.contains(suffix) ||
          candidate.displayName.replace(" ", "").contains(suffix)
      }
    if (numberMatch) score += 100

    val modified = candidate.lastModifiedMs
    val inWindow = modified in windowStart..windowEnd
    if (inWindow) score += 50

    // Prefer files closer to call end (dialers often finalize then).
    val anchor = if (callEnded > callStarted) callEnded else callStarted
    val delta = kotlin.math.abs(modified - anchor)
    score +=
      when {
        delta <= 30_000L -> 30
        delta <= 90_000L -> 20
        delta <= 180_000L -> 10
        else -> 0
      }

    // Without number or window match, ignore generic music files.
    if (!numberMatch && !inWindow) return 0
    // Tiny stubs are usually useless.
    if (candidate.sizeBytes < 2_000L) score -= 40
    return score
  }

  private fun copyToAppStorage(context: Context, candidate: Candidate): File {
    val dir = File(context.applicationContext.filesDir, "call-recordings")
    if (!dir.exists()) dir.mkdirs()
    val ext = candidate.displayName.substringAfterLast('.', "m4a").lowercase()
    val safeExt = if (ext in AUDIO_EXTENSIONS) ext else "m4a"
    val out = File(dir, "mudrax-dialer-${System.currentTimeMillis()}.$safeExt")
    val input =
      candidate.open(context)
        ?: throw IllegalStateException("Could not open dialer recording file.")
    input.use { stream ->
      FileOutputStream(out).use { output ->
        stream.copyTo(output)
      }
    }
    if (!out.exists() || out.length() <= 0L) {
      runCatching { out.delete() }
      throw IllegalStateException("Imported recording file was empty.")
    }
    return out
  }

  private fun isAudioFileName(name: String): Boolean {
    val ext = name.substringAfterLast('.', "").lowercase()
    return ext in AUDIO_EXTENSIONS
  }

  private fun friendlyTreeLabel(uri: String): String {
    return runCatching {
      val parsed = Uri.parse(uri)
      val docId = DocumentsContract.getTreeDocumentId(parsed)
      docId.substringAfterLast(':').ifBlank { docId }
    }.getOrDefault("Selected folder")
  }

  private data class Candidate(
    val displayName: String,
    val lastModifiedMs: Long,
    val sizeBytes: Long,
    val open: (Context) -> java.io.InputStream?,
    val boost: Int = 0,
  )
}
