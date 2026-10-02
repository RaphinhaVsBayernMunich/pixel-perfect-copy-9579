package app.questos.android;

import android.Manifest;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.*;
import java.time.Instant;
import java.util.*;

@CapacitorPlugin(name="QuestOSNative", permissions={@Permission(alias="calendar",strings={Manifest.permission.READ_CALENDAR,Manifest.permission.WRITE_CALENDAR})})
public class QuestOSNativePlugin extends Plugin {
 @PluginMethod public void shareText(PluginCall call){
  try {
   String name=call.getString("name"),value=call.getString("value"),type=call.getString("type");
   if(name==null||!name.matches("[A-Za-z0-9._-]{1,100}")||value==null||value.length()>16000000||!("application/json".equals(type)||"text/calendar".equals(type)||"text/csv".equals(type)||"text/plain".equals(type)))throw new IllegalArgumentException();
   java.io.File dir=new java.io.File(getContext().getCacheDir(),"exports");if(!dir.exists()&&!dir.mkdirs())throw new java.io.IOException();
   java.io.File[] old=dir.listFiles();if(old!=null)for(java.io.File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
   java.io.File file=new java.io.File(dir,name);
   try(java.io.FileOutputStream out=new java.io.FileOutputStream(file)){out.write(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));}
   Uri uri=androidx.core.content.FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);
   Intent share=new Intent(Intent.ACTION_SEND).setType(type).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
   share.setClipData(ClipData.newRawUri("QuestOS export",uri));
   getActivity().runOnUiThread(()->{try{getActivity().startActivity(Intent.createChooser(share,"Save or share your QuestOS export"));call.resolve();}catch(Exception e){call.reject("No app is available to save this export.");}});
  } catch(Exception e){call.reject("Export could not be prepared.");}
 }
 @PluginMethod public void calendars(PluginCall call){
  if(getPermissionState("calendar")!=PermissionState.GRANTED){requestPermissionForAlias("calendar",call,"calendarPermission");return;} listCalendars(call);
 }
 @PermissionCallback private void calendarPermission(PluginCall call){if(getPermissionState("calendar")==PermissionState.GRANTED)listCalendars(call);else call.reject("Calendar permission was not granted.");}
 private void listCalendars(PluginCall call){
  try(Cursor c=getContext().getContentResolver().query(CalendarContract.Calendars.CONTENT_URI,new String[]{"_id","calendar_displayName"},"calendar_access_level>=? AND visible=1",new String[]{String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR)},null)){
   JSArray list=new JSArray();if(c!=null)while(c.moveToNext()){JSObject item=new JSObject();item.put("id",c.getString(0));item.put("name",c.getString(1));list.put(item);}JSObject out=new JSObject();out.put("calendars",list);call.resolve(out);
  }catch(Exception e){call.reject("Calendars could not be read.");}
 }
 private boolean allowed(PluginCall call){if(getPermissionState("calendar")!=PermissionState.GRANTED){call.reject("Connect a calendar first.");return false;}return true;}
 private String prefix(String user){UUID.fromString(user);return "questos:"+user+":";}
 @PluginMethod public void readCalendar(PluginCall call){
  if(!allowed(call))return;
  try{
   String calendar=call.getString("calendarId"), tag=prefix(call.getString("userId"));Long.parseLong(calendar);
   long start=Instant.parse(call.getString("start")).toEpochMilli(),end=Instant.parse(call.getString("end")).toEpochMilli();
   if(end<=start||end-start>100L*86400000)throw new IllegalArgumentException();
   Uri.Builder uri=CalendarContract.Instances.CONTENT_URI.buildUpon();ContentUris.appendId(uri,start);ContentUris.appendId(uri,end);
   JSArray list=new JSArray();
   try(Cursor c=getContext().getContentResolver().query(uri.build(),new String[]{"event_id","title","begin","end","description"},"calendar_id=?",new String[]{calendar},"begin ASC")){
    if(c!=null)while(c.moveToNext()){
     if(list.length()>=300)throw new IllegalStateException("Too many calendar events; select a smaller calendar.");
     if(c.getLong(3)<=c.getLong(2))continue;
     JSObject item=new JSObject();item.put("id",c.getString(0)+":"+c.getLong(2));item.put("title",c.getString(1)==null?"Untitled":c.getString(1));item.put("start",Instant.ofEpochMilli(c.getLong(2)).toString());item.put("end",Instant.ofEpochMilli(c.getLong(3)).toString());
     // Ownership is stored privately by this app, never inferred from editable event descriptions.
     String quest=getContext().getSharedPreferences("calendar-links",0).getString(tag+calendar+":"+c.getString(0),null);
     if(quest!=null)item.put("questId",quest);list.put(item);
    }
   }JSObject out=new JSObject();out.put("events",list);call.resolve(out);
  }catch(Exception e){call.reject("Calendar preview failed. Use a calendar with at most 300 events.");}
 }
 @PluginMethod public void writeCalendar(PluginCall call){
  if(!allowed(call))return;
  try{
   String calendar=call.getString("calendarId"),tag=prefix(call.getString("userId"));long calendarId=Long.parseLong(calendar);JSArray events=call.getArray("events");if(events==null||events.length()>300)throw new IllegalArgumentException();
   SharedPreferences links=getContext().getSharedPreferences("calendar-links",0);
   // Validate every input before writing any event. applyBatch makes the provider writes atomic.
   ArrayList<ContentProviderOperation> operations=new ArrayList<>();ArrayList<String> quests=new ArrayList<>();ArrayList<Long> existingIds=new ArrayList<>();
   for(int i=0;i<events.length();i++){
    JSONObject e=events.getJSONObject(i);String quest=e.getString("questId");UUID.fromString(quest);String title=e.getString("title");if(title.length()>240)throw new IllegalArgumentException();
    long start=Instant.parse(e.getString("start")).toEpochMilli(),end=Instant.parse(e.getString("end")).toEpochMilli();if(end<=start||end-start>86400000)throw new IllegalArgumentException();
    long existing=links.getLong(tag+calendar+":quest:"+quest,-1);
    if(existing!=-1)try(Cursor c=getContext().getContentResolver().query(CalendarContract.Events.CONTENT_URI,new String[]{"_id"},"_id=? AND calendar_id=? AND deleted=0",new String[]{String.valueOf(existing),calendar},null)){if(c==null||!c.moveToFirst())existing=-1;}
    ContentValues values=new ContentValues();values.put("title",title);values.put("dtstart",start);values.put("dtend",end);values.put("eventTimezone",TimeZone.getDefault().getID());
    ContentProviderOperation.Builder operation;
    if(existing==-1){values.put("calendar_id",calendarId);operation=ContentProviderOperation.newInsert(CalendarContract.Events.CONTENT_URI);}else operation=ContentProviderOperation.newUpdate(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI,existing));
    operations.add(operation.withValues(values).build());quests.add(quest);existingIds.add(existing);
   }
   ContentProviderResult[] results=getContext().getContentResolver().applyBatch(CalendarContract.AUTHORITY,operations);
   SharedPreferences.Editor edit=links.edit();for(int i=0;i<results.length;i++){long id=existingIds.get(i)==-1?ContentUris.parseId(results[i].uri):existingIds.get(i);edit.putLong(tag+calendar+":quest:"+quests.get(i),id);edit.putString(tag+calendar+":"+id,quests.get(i));}
   if(!edit.commit())throw new IllegalStateException();call.resolve();
  }catch(Exception e){call.reject("Calendar sync could not complete. Check calendar access and retry; existing unrelated events are preserved.");}
 }
 @PluginMethod public void widget(PluginCall call){
  String text=call.getString("text","");long expires=call.getLong("expiresAt",0L);if(text.length()>2000)text=text.substring(0,2000);
  getContext().getSharedPreferences("questos-widget",0).edit().putString("text",text).putLong("expires",Math.min(expires,System.currentTimeMillis()+3600000)).apply();
  QuestWidget.updateAll(getContext());call.resolve();
 }
 @PluginMethod public void pinWidget(PluginCall call){
  AppWidgetManager manager=AppWidgetManager.getInstance(getContext());if(!manager.isRequestPinAppWidgetSupported()){call.reject("This launcher does not support automatic widget pinning.");return;}
  manager.requestPinAppWidget(new ComponentName(getContext(),QuestWidget.class),null,null);call.resolve();
 }
}
