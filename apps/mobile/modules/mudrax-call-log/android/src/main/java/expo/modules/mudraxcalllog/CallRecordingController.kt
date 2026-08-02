package expo.modules.mudraxcalllog

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Best-effort Android call recording while the system dialer owns the call.
 *
 * Full duplex cellular capture (VOICE_CALL) is blocked for normal apps on
 * modern Android. We capture the device microphone — put the call on
 * speakerphone for usable voice. Never throws into the JS dial flow.
 */
internal object CallRecordingController {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val armed = AtomicBoolean(false)
  private val recording = AtomicBoolean(false)

  @Volatile private var appContext: Context? = null
  @Volatile private var telephonyManager: TelephonyManager? = null
  @Volatile private var telephonyCallback: Any? = null
  @Suppress("DEPRECATION")
  @Volatile private var phoneStateListener: PhoneStateListener? = null
  @Volatile private var mediaRecorder: MediaRecorder? = null
  @Volatile private var mediaPlayer: MediaPlayer? = null
  @Volatile private var previousAudioMode: Int = AudioManager.MODE_NORMAL
  @Volatile private var audioManagerTouched: Boolean = false

  @Volatile var state: String = "idle"
    private set
  @Volatile var outputPath: String? = null
    private set
  @Volatile var startedAtMs: Long = 0L
    private set
  @Volatile var endedAtMs: Long = 0L
    private set
  @Volatile var audioSourceUsed: String? = null
    private set
  @Volatile var errorMessage: String? = null
    private set
  @Volatile private var phoneHintDigits: String = ""

  fun isAvailable(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(
      context,
      android.Manifest.permission.RECORD_AUDIO,
    ) == PackageManager.PERMISSION_GRANTED
  }

  @Synchronized
  fun arm(context: Context, phoneDigits: String): Map<String, Any?> {
    if (armed.get() || recording.get()) {
      return snapshot(armed = true)
    }

    val app = context.applicationContext
    appContext = app
    phoneHintDigits = phoneDigits.filter { it.isDigit() }
    errorMessage = null
    audioSourceUsed = null
    startedAtMs = 0L
    endedAtMs = 0L

    val dir = File(app.filesDir, "call-recordings")
    if (!dir.exists()) {
      dir.mkdirs()
    }
    val file = File(dir, "mudrax-${System.currentTimeMillis()}.m4a")
    outputPath = file.absolutePath
    state = "armed"
    armed.set(true)

    // Start the microphone foreground service *before* MediaRecorder so
    // capture survives the jump into the system dialer (Android 12+).
    CallRecordingService.start(app, "Recording call…")
    registerCallStateListener(app)

    // Start capture while Mudrax is still in the foreground. Waiting for
    // OFFHOOK often fails because the dialer already backgrounded us by then.
    startRecorder()

    return snapshot(armed = true)
  }

  @Synchronized
  fun disarm(): Map<String, Any?> {
    val wasRecording = recording.get()
    if (wasRecording) {
      stopRecorder(success = true)
    }
    unregisterCallStateListener()
    appContext?.let { CallRecordingService.stop(it) }
    armed.set(false)

    if (state == "armed" || (state == "failed" && !fileHasAudio())) {
      // Never captured audio — discard empty stub.
      outputPath?.let { path ->
        runCatching { File(path).delete() }
      }
      outputPath = null
      if (state == "armed") state = "idle"
    }

    return snapshot(armed = false)
  }

  private fun fileHasAudio(): Boolean {
    val path = outputPath ?: return false
    return File(path).exists() && File(path).length() > 0L
  }

  /** Resolve `android-local://call-recordings/<file>` to an on-device file. */
  fun resolveLocalRecordingFile(context: Context, storageReference: String): File? {
    val prefix = "android-local://call-recordings/"
    if (!storageReference.startsWith(prefix)) return null
    val name = storageReference.removePrefix(prefix).substringAfterLast('/').trim()
    if (name.isEmpty() || name.contains("..") || name.contains('\\') || name.contains('/')) {
      return null
    }
    val file = File(File(context.applicationContext.filesDir, "call-recordings"), name)
    return if (file.exists() && file.isFile && file.length() > 0L) file else null
  }

  @Synchronized
  fun playLocalRecording(context: Context, storageReference: String): Map<String, Any?> {
    val file =
      resolveLocalRecordingFile(context, storageReference)
        ?: return mapOf(
          "ok" to false,
          "playing" to false,
          "error" to "Recording file not found on this phone.",
          "path" to null,
        )

    stopLocalPlayback()
    return try {
      val player = MediaPlayer().apply {
        setDataSource(file.absolutePath)
        setOnCompletionListener { stopLocalPlayback() }
        prepare()
        start()
      }
      mediaPlayer = player
      mapOf(
        "ok" to true,
        "playing" to true,
        "error" to null,
        "path" to file.absolutePath,
        "durationSeconds" to (player.duration / 1000).coerceAtLeast(0),
      )
    } catch (error: Exception) {
      stopLocalPlayback()
      mapOf(
        "ok" to false,
        "playing" to false,
        "error" to (error.message ?: "Could not play recording."),
        "path" to file.absolutePath,
      )
    }
  }

  @Synchronized
  fun stopLocalPlayback(): Map<String, Any?> {
    val player = mediaPlayer
    mediaPlayer = null
    if (player != null) {
      runCatching {
        if (player.isPlaying) player.stop()
      }
      runCatching { player.reset() }
      runCatching { player.release() }
    }
    return mapOf("ok" to true, "playing" to false, "error" to null)
  }

  fun isLocalPlaybackPlaying(): Boolean {
    return runCatching { mediaPlayer?.isPlaying == true }.getOrDefault(false)
  }

  fun snapshot(armed: Boolean = this.armed.get()): Map<String, Any?> {
    val path = outputPath
    val durationSeconds =
      if (startedAtMs > 0L) {
        val end = if (endedAtMs > 0L) endedAtMs else System.currentTimeMillis()
        ((end - startedAtMs) / 1000L).toInt().coerceAtLeast(0)
      } else {
        0
      }
    val fileExists = path != null && File(path).exists() && File(path).length() > 0L

    return mapOf(
      "state" to state,
      "armed" to armed,
      "recording" to recording.get(),
      "filePath" to if (fileExists) path else null,
      "storageReference" to
        if (fileExists && path != null) {
          "android-local://call-recordings/${File(path).name}"
        } else {
          null
        },
      "startedAtMs" to startedAtMs.toDouble(),
      "endedAtMs" to endedAtMs.toDouble(),
      "durationSeconds" to durationSeconds,
      "audioSource" to audioSourceUsed,
      "phoneDigits" to phoneHintDigits,
      "error" to errorMessage,
    )
  }

  private fun onCallStateChanged(stateCode: Int) {
    when (stateCode) {
      TelephonyManager.CALL_STATE_OFFHOOK -> {
        // Prefer capture started at arm-time. Retry only if arm-time start failed.
        if (armed.get() && !recording.get() && state != "completed") {
          startRecorder()
        }
      }
      TelephonyManager.CALL_STATE_IDLE -> {
        if (recording.get()) {
          stopRecorder(success = true)
          unregisterCallStateListener()
          armed.set(false)
          appContext?.let { CallRecordingService.stop(it) }
        }
        // If still armed with no active recorder, leave state for JS disarm
        // (cancelled dial / never connected).
      }
      else -> Unit
    }
  }

  private fun prepareAudioRoute(context: Context) {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    if (!audioManagerTouched) {
      previousAudioMode = am.mode
      audioManagerTouched = true
    }
    // Helps the mic pick up call audio when the user enables speakerphone.
    runCatching { am.mode = AudioManager.MODE_IN_COMMUNICATION }
  }

  private fun restoreAudioRoute(context: Context?) {
    if (!audioManagerTouched) return
    val am =
      context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: appContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return
    runCatching { am.mode = previousAudioMode }
    audioManagerTouched = false
  }

  private fun startRecorder() {
    val context = appContext ?: return
    val path = outputPath ?: return
    if (recording.get()) return
    if (!isAvailable(context)) {
      errorMessage = "RECORD_AUDIO permission is required."
      state = "failed"
      return
    }

    prepareAudioRoute(context)
    CallRecordingService.start(context, "Recording call… Use speakerphone for clearer audio.")

    // MIC first: with speakerphone this captures usable voice. VOICE_CALL is
    // usually blocked for non-system apps; VOICE_COMMUNICATION often records silence.
    val sources =
      listOf(
        MediaRecorder.AudioSource.MIC to "MIC",
        MediaRecorder.AudioSource.VOICE_RECOGNITION to "VOICE_RECOGNITION",
        MediaRecorder.AudioSource.VOICE_COMMUNICATION to "VOICE_COMMUNICATION",
        MediaRecorder.AudioSource.VOICE_CALL to "VOICE_CALL",
      )

    for ((source, label) in sources) {
      // Recreate the output file if a previous source left a broken stub.
      runCatching {
        val file = File(path)
        if (file.exists()) file.delete()
      }
      val recorder = createRecorder(context)
      try {
        recorder.setAudioSource(source)
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        recorder.setAudioEncodingBitRate(128_000)
        recorder.setAudioSamplingRate(44_100)
        runCatching { recorder.setAudioChannels(1) }
        recorder.setOutputFile(path)
        recorder.prepare()
        recorder.start()
        mediaRecorder = recorder
        audioSourceUsed = label
        startedAtMs = System.currentTimeMillis()
        endedAtMs = 0L
        recording.set(true)
        state = "recording"
        errorMessage = null
        return
      } catch (_: Exception) {
        runCatching {
          recorder.reset()
          recorder.release()
        }
      }
    }

    errorMessage =
      "Device blocked call audio capture. Put the call on speakerphone and try again."
    state = "failed"
    recording.set(false)
    mediaRecorder = null
    restoreAudioRoute(context)
  }

  private fun stopRecorder(success: Boolean) {
    val recorder = mediaRecorder
    mediaRecorder = null
    recording.set(false)
    endedAtMs = System.currentTimeMillis()
    restoreAudioRoute(appContext)

    if (recorder != null) {
      try {
        recorder.stop()
      } catch (_: Exception) {
        // stop() throws if start() never completed — treat as failure below.
      }
      try {
        recorder.reset()
        recorder.release()
      } catch (_: Exception) {
        // ignore
      }
    }

    val path = outputPath
    val fileOk = path != null && File(path).exists() && File(path).length() > 0L
    state =
      when {
        success && fileOk -> "completed"
        errorMessage != null -> "failed"
        else -> {
          errorMessage = errorMessage ?: "Recording file was empty."
          "failed"
        }
      }
  }

  private fun createRecorder(context: Context): MediaRecorder {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      MediaRecorder(context)
    } else {
      @Suppress("DEPRECATION")
      MediaRecorder()
    }
  }

  private fun registerCallStateListener(context: Context) {
    val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    telephonyManager = tm

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val callback =
        object : TelephonyCallback(), TelephonyCallback.CallStateListener {
          override fun onCallStateChanged(state: Int) {
            mainHandler.post { onCallStateChanged(state) }
          }
        }
      telephonyCallback = callback
      tm.registerTelephonyCallback(context.mainExecutor, callback)
    } else {
      @Suppress("DEPRECATION")
      val listener =
        object : PhoneStateListener() {
          @Deprecated("Deprecated in Java")
          override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            mainHandler.post { onCallStateChanged(state) }
          }
        }
      phoneStateListener = listener
      @Suppress("DEPRECATION")
      tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
    }
  }

  private fun unregisterCallStateListener() {
    val tm = telephonyManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val callback = telephonyCallback as? TelephonyCallback
      if (callback != null) {
        runCatching { tm.unregisterTelephonyCallback(callback) }
      }
      telephonyCallback = null
    } else {
      @Suppress("DEPRECATION")
      val listener = phoneStateListener
      if (listener != null) {
        @Suppress("DEPRECATION")
        runCatching { tm.listen(listener, PhoneStateListener.LISTEN_NONE) }
      }
      phoneStateListener = null
    }
    telephonyManager = null
  }
}
