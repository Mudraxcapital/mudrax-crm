package expo.modules.mudraxcalllog

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Foreground service so microphone capture can continue while the system
 * dialer is in the foreground (Android 12+ background mic limits).
 */
class CallRecordingService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val text = intent?.getStringExtra(EXTRA_TEXT) ?: "Recording call…"
    ensureChannel()
    val notification = buildNotification(text)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      @Suppress("DEPRECATION")
      startForeground(NOTIFICATION_ID, notification)
    }

    return START_STICKY
  }

  override fun onDestroy() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    super.onDestroy()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Call recording",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Shown while Mudrax is recording an outbound call"
        setShowBadge(false)
      }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(text: String): Notification {
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }

    return builder
      .setContentTitle("Mudrax CRM")
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "mudrax_call_recording"
    private const val NOTIFICATION_ID = 771421
    private const val EXTRA_TEXT = "text"

    fun start(context: Context, text: String) {
      val intent =
        Intent(context, CallRecordingService::class.java).apply {
          putExtra(EXTRA_TEXT, text)
        }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, CallRecordingService::class.java))
    }
  }
}
