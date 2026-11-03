package com.vslash.callstate;

import android.Manifest;
import android.content.Context;
import android.hardware.display.DisplayManager;
import android.media.AudioManager;
import android.telephony.TelephonyManager;
import android.view.Display;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * PayShield call-state signal. Answers three yes/no questions and nothing else:
 *  - Is a call in progress? (AudioManager mode: works for SIM and for WhatsApp/VoIP calls, no permission needed)
 *  - Is a SIM call ringing or off-hook? (TelephonyManager, only if the user grants READ_PHONE_STATE)
 *  - Is the screen being mirrored or shared? (an extra display exists: casting or a screen-share app)
 * It never reads phone numbers, call logs, audio or message content.
 */
@CapacitorPlugin(
    name = "CallState",
    permissions = { @Permission(alias = "phone", strings = { Manifest.permission.READ_PHONE_STATE }) }
)
public class CallStatePlugin extends Plugin {

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(snapshot());
    }

    @PluginMethod
    public void requestPhonePermission(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            call.resolve(snapshot());
            return;
        }
        requestPermissionForAlias("phone", call, "phonePermissionCallback");
    }

    @PermissionCallback
    private void phonePermissionCallback(PluginCall call) {
        call.resolve(snapshot());
    }

    private JSObject snapshot() {
        JSObject r = new JSObject();
        Context ctx = getContext();

        String audio = "idle";
        try {
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            int mode = am.getMode();
            if (mode == AudioManager.MODE_IN_CALL) audio = "call";
            else if (mode == AudioManager.MODE_IN_COMMUNICATION) audio = "voip";
            else if (mode == AudioManager.MODE_RINGTONE) audio = "ringing";
        } catch (Exception ignored) { }

        boolean granted = getPermissionState("phone") == PermissionState.GRANTED;
        String sim = "unknown";
        if (granted) {
            try {
                TelephonyManager tm = (TelephonyManager) ctx.getSystemService(Context.TELEPHONY_SERVICE);
                int s = tm.getCallState();
                sim = s == TelephonyManager.CALL_STATE_RINGING ? "ringing" : s == TelephonyManager.CALL_STATE_OFFHOOK ? "offhook" : "idle";
            } catch (Exception ignored) { }
        }

        boolean shared = false;
        try {
            DisplayManager dm = (DisplayManager) ctx.getSystemService(Context.DISPLAY_SERVICE);
            Display[] displays = dm.getDisplays();
            shared = displays != null && displays.length > 1;
        } catch (Exception ignored) { }

        r.put("audioMode", audio);
        r.put("sim", sim);
        r.put("phonePermission", granted);
        r.put("screenShared", shared);
        r.put("onCall", "call".equals(audio) || "voip".equals(audio) || "offhook".equals(sim));
        r.put("kind", "offhook".equals(sim) || "call".equals(audio) ? "phone" : "voip".equals(audio) ? "internet" : "none");
        r.put("ringing", "ringing".equals(sim) || "ringing".equals(audio));
        return r;
    }
}
