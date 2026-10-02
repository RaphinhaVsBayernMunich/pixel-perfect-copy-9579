import { registerPlugin } from "@capacitor/core";
export type DeviceEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  questId?: string;
};
export const QuestOSNative = registerPlugin<{
  shareText(input: { name: string; value: string; type: string }): Promise<void>;
  calendars(): Promise<{ calendars: { id: string; name: string }[] }>;
  readCalendar(input: {
    calendarId: string;
    userId: string;
    start: string;
    end: string;
  }): Promise<{ events: DeviceEvent[] }>;
  writeCalendar(input: {
    calendarId: string;
    userId: string;
    events: DeviceEvent[];
  }): Promise<void>;
  widget(input: { text: string; expiresAt: number }): Promise<void>;
  pinWidget(): Promise<void>;
}>("QuestOSNative");
