package com.getcapacitor.myapp;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("app.questos.android", appContext.getPackageName());
    }

    @Test
    public void productionRuntimeAndRecoveryArePackaged() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        JSONObject config;
        try (java.io.InputStream stream = context.getAssets().open("capacitor.config.json")) {
            config = new JSONObject(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
        }
        JSONObject server = config.getJSONObject("server");
        assertEquals("https://questos.questos-1fd92776.workers.dev", server.getString("url"));
        assertFalse(server.getBoolean("cleartext"));
        assertEquals("offline.html", server.getString("errorPath"));
        assertFalse(config.getJSONObject("android").getBoolean("allowMixedContent"));
        assertFalse(config.getJSONObject("android").getBoolean("webContentsDebuggingEnabled"));
        try (java.io.InputStream stream = context.getAssets().open("public/offline.html")) {
            String page = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(page.contains("Retry QuestOS"));
            assertTrue(page.contains(server.getString("url")));
        }
    }

    @Test
    public void authCallbackResolvesToQuestos() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent callback = new Intent(Intent.ACTION_VIEW, Uri.parse("app.questos.android://auth/callback?code=test"));
        callback.addCategory(Intent.CATEGORY_BROWSABLE);
        callback.setPackage(context.getPackageName());
        assertNotNull(context.getPackageManager().resolveActivity(callback, 0));
        Intent unrelated = new Intent(Intent.ACTION_VIEW, Uri.parse("app.questos.android://other/callback"));
        unrelated.addCategory(Intent.CATEGORY_BROWSABLE);
        unrelated.setPackage(context.getPackageName());
        assertNull(context.getPackageManager().resolveActivity(unrelated, 0));
    }

    @Test
    public void appBackupAndCleartextAreDisabled() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        int flags = context.getApplicationInfo().flags;
        assertEquals(0, flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(0, flags & ApplicationInfo.FLAG_USES_CLEARTEXT_TRAFFIC);
    }
}
