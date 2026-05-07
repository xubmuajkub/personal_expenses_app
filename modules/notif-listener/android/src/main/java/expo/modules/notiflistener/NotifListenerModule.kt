package expo.modules.notiflistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotifListenerModule : Module() {

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("NotifListener")
    Events("onNotification", "onState")

    Function("isPermissionGranted") {
      val ctx = appContext.reactContext ?: return@Function false
      val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
      flat?.contains(ctx.packageName) == true
    }

    Function("openSettings") {
      val ctx = appContext.reactContext ?: return@Function
      val i = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      i.flags = Intent.FLAG_ACTIVITY_NEW_TASK
      ctx.startActivity(i)
    }

    OnStartObserving {
      val ctx = appContext.reactContext ?: return@OnStartObserving
      val r = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          when (intent.action) {
            "expo.modules.notiflistener.NOTIFICATION" ->
              sendEvent("onNotification", mapOf("payload" to (intent.getStringExtra("payload") ?: "")))
            "expo.modules.notiflistener.STATE" ->
              sendEvent("onState", mapOf("active" to intent.getBooleanExtra("active", false)))
          }
        }
      }
      val f = IntentFilter().apply {
        addAction("expo.modules.notiflistener.NOTIFICATION")
        addAction("expo.modules.notiflistener.STATE")
      }
      ctx.registerReceiver(r, f, Context.RECEIVER_NOT_EXPORTED)
      receiver = r
    }

    OnStopObserving {
      val ctx = appContext.reactContext ?: return@OnStopObserving
      receiver?.let { ctx.unregisterReceiver(it) }
      receiver = null
    }
  }
}
