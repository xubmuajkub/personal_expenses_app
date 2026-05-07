package expo.modules.notiflistener

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

class AppNotificationListenerService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      val pkg = sbn.packageName ?: return
      val extras = sbn.notification.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
      val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
      val payload = JSONObject().apply {
        put("package", pkg)
        put("title", title)
        put("text", text)
        put("postedAt", sbn.postTime)
        put("key", sbn.key)
      }
      val i = Intent("expo.modules.notiflistener.NOTIFICATION").apply {
        setPackage(applicationContext.packageName)
        putExtra("payload", payload.toString())
      }
      sendBroadcast(i)
    } catch (_: Throwable) { /* swallow; never crash the listener */ }
  }

  override fun onListenerConnected() { sendActiveBroadcast(true) }
  override fun onListenerDisconnected() { sendActiveBroadcast(false) }

  private fun sendActiveBroadcast(active: Boolean) {
    val i = Intent("expo.modules.notiflistener.STATE").apply {
      setPackage(applicationContext.packageName)
      putExtra("active", active)
    }
    sendBroadcast(i)
  }
}
