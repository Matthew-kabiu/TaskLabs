export const TASK_LEAD_PRESETS: number[] = [15, 30, 60, 240, 1440, 2880];
export const EVENT_LEAD_PRESETS: number[] = [5, 10, 15, 30, 60, 120];

export interface UserLeadPrefs {
  notifyLeadMinutesTask: number[];
  notifyLeadMinutesEvent: number[];
  notifyLeadCustomTask: boolean;
  notifyLeadCustomEvent: boolean;
}

export function effectiveTaskLeads(
  u: Pick<UserLeadPrefs, 'notifyLeadMinutesTask' | 'notifyLeadCustomTask'>,
): number[] {
  return u.notifyLeadCustomTask ? u.notifyLeadMinutesTask : TASK_LEAD_PRESETS;
}

export function effectiveEventLeads(
  u: Pick<UserLeadPrefs, 'notifyLeadMinutesEvent' | 'notifyLeadCustomEvent'>,
): number[] {
  return u.notifyLeadCustomEvent ? u.notifyLeadMinutesEvent : EVENT_LEAD_PRESETS;
}
