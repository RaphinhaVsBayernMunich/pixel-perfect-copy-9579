package app.questos.android;
import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.widget.RemoteViews;
public class QuestWidget extends AppWidgetProvider {
 public static void updateAll(Context context){AppWidgetManager manager=AppWidgetManager.getInstance(context);new QuestWidget().onUpdate(context,manager,manager.getAppWidgetIds(new ComponentName(context,QuestWidget.class)));}
 @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids){
  android.content.SharedPreferences prefs=context.getSharedPreferences("questos-widget",0);
  String text=prefs.getLong("expires",0)>System.currentTimeMillis()?prefs.getString("text",""):"";
  for(int id:ids){RemoteViews view=new RemoteViews(context.getPackageName(),R.layout.quest_widget);view.setTextViewText(R.id.widget_text,text.isEmpty()?"Open QuestOS to refresh your upcoming quests.":text);
   view.setOnClickPendingIntent(R.id.widget_text,PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));manager.updateAppWidget(id,view);}
 }
}
