package app.questos.android;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
 @Override public void onCreate(android.os.Bundle savedInstanceState) { registerPlugin(QuestOSNativePlugin.class); super.onCreate(savedInstanceState); }
}
