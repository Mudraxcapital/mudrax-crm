package expo.modules.mudraxcalllog

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MudraxCallLogModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var folderPickPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("MudraxCallLog")

    Function("isAvailable") {
      true
    }

    Function("isCallRecordingAvailable") {
      // Dialer-file sync does not need RECORD_AUDIO; keep for local playback helpers.
      CallRecordingController.isAvailable(context) ||
        (DialerRecordingSync.folderSnapshot(context)["configured"] as? Boolean == true)
    }

    Function("getCallRecordingState") {
      CallRecordingController.snapshot()
    }

    AsyncFunction("armCallRecording") { phoneDigits: String ->
      // Legacy mic path retained for compatibility; JS uses dialer sync instead.
      if (
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED
      ) {
        throw RecordingPermissionException()
      }
      if (
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
        != PackageManager.PERMISSION_GRANTED
      ) {
        throw PhoneStatePermissionException()
      }
      CallRecordingController.arm(context, phoneDigits)
    }

    AsyncFunction("disarmCallRecording") {
      CallRecordingController.disarm()
    }

    Function("hasLocalCallRecording") { storageReference: String ->
      CallRecordingController.resolveLocalRecordingFile(context, storageReference) != null
    }

    AsyncFunction("playLocalCallRecording") { storageReference: String ->
      CallRecordingController.playLocalRecording(context, storageReference)
    }

    AsyncFunction("stopLocalCallRecordingPlayback") {
      CallRecordingController.stopLocalPlayback()
    }

    Function("isLocalCallRecordingPlaying") {
      CallRecordingController.isLocalPlaybackPlaying()
    }

    Function("getLocalCallRecordingPath") { storageReference: String ->
      CallRecordingController.resolveLocalRecordingFile(context, storageReference)?.absolutePath
    }

    Function("getDialerRecordingFolder") {
      DialerRecordingSync.folderSnapshot(context)
    }

    AsyncFunction("clearDialerRecordingFolder") {
      DialerRecordingSync.clearFolder(context)
    }

    AsyncFunction("pickDialerRecordingFolder") { promise: Promise ->
      val activity =
        appContext.currentActivity
          ?: run {
            promise.reject(
              "E_NO_ACTIVITY",
              "Cannot open folder picker without an active Android activity.",
              null,
            )
            return@AsyncFunction
          }
      folderPickPromise?.reject(
        "E_PICK_CANCELLED",
        "Replaced by a newer folder pick request.",
        null,
      )
      folderPickPromise = promise
      try {
        activity.startActivityForResult(
          DialerRecordingSync.createPickIntent(),
          REQUEST_PICK_FOLDER,
        )
      } catch (error: Exception) {
        folderPickPromise = null
        promise.reject(
          "E_PICK_FAILED",
          error.message ?: "Could not open the folder picker.",
          error,
        )
      }
    }

    AsyncFunction("importDialerCallRecording") {
        phoneDigits: String,
        callStartedAtMs: Double,
        durationSeconds: Int,
      ->
      DialerRecordingSync.findAndImport(
        context,
        phoneDigits,
        callStartedAtMs.toLong(),
        durationSeconds,
      )
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_PICK_FOLDER) return@OnActivityResult
      val promise = folderPickPromise ?: return@OnActivityResult
      folderPickPromise = null
      if (payload.resultCode != Activity.RESULT_OK) {
        promise.resolve(
          DialerRecordingSync.folderSnapshot(context).toMutableMap().apply {
            put("configured", this["configured"] == true)
            put("cancelled", true)
          },
        )
        return@OnActivityResult
      }
      promise.resolve(DialerRecordingSync.persistFolderFromResult(context, payload.data))
    }

    AsyncFunction("findLatestOutboundCall") { phoneDigits: String, sinceEpochMs: Double ->
      if (
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)
        != PackageManager.PERMISSION_GRANTED
      ) {
        throw PermissionException()
      }

      val needle = phoneDigits.filter { it.isDigit() }
      if (needle.length < 6) {
        return@AsyncFunction null
      }
      val suffixLen = minOf(10, needle.length)
      val needleSuffix = needle.takeLast(suffixLen)
      val sinceMs = sinceEpochMs.toLong().coerceAtLeast(0L)

      val projection =
        arrayOf(
          CallLog.Calls.NUMBER,
          CallLog.Calls.TYPE,
          CallLog.Calls.DATE,
          CallLog.Calls.DURATION,
        )

      // Newest first; restrict to recent window to keep the scan cheap.
      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        "${CallLog.Calls.TYPE} = ? AND ${CallLog.Calls.DATE} >= ?",
        arrayOf(CallLog.Calls.OUTGOING_TYPE.toString(), sinceMs.toString()),
        "${CallLog.Calls.DATE} DESC",
      )?.use { cursor ->
        val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
        val dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE)
        val durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION)
        while (cursor.moveToNext()) {
          val rawNumber = if (numberIdx >= 0) cursor.getString(numberIdx).orEmpty() else ""
          val digits = rawNumber.filter { it.isDigit() }
          if (digits.isEmpty()) continue
          if (!digits.endsWith(needleSuffix) && !needleSuffix.endsWith(digits.takeLast(suffixLen))) {
            continue
          }
          val dateMs = if (dateIdx >= 0) cursor.getLong(dateIdx) else 0L
          val durationSec = if (durationIdx >= 0) cursor.getLong(durationIdx).toInt() else 0
          return@AsyncFunction mapOf(
            "number" to rawNumber,
            "startedAtMs" to dateMs.toDouble(),
            "durationSeconds" to durationSec,
          )
        }
      }

      null
    }
  }

  companion object {
    private const val REQUEST_PICK_FOLDER = 771430
  }
}

class PermissionException :
  expo.modules.kotlin.exception.CodedException(
    "CALL_LOG_PERMISSION_DENIED",
    "READ_CALL_LOG permission is required to verify that a call was placed.",
    null,
  )

class RecordingPermissionException :
  expo.modules.kotlin.exception.CodedException(
    "RECORD_AUDIO_PERMISSION_DENIED",
    "RECORD_AUDIO permission is required to record calls.",
    null,
  )

class PhoneStatePermissionException :
  expo.modules.kotlin.exception.CodedException(
    "READ_PHONE_STATE_PERMISSION_DENIED",
    "READ_PHONE_STATE permission is required to detect when a call is active.",
    null,
  )
