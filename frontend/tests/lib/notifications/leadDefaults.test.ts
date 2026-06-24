import { describe, it, expect } from 'vitest';
import {
  TASK_LEAD_PRESETS,
  EVENT_LEAD_PRESETS,
  effectiveTaskLeads,
  effectiveEventLeads,
} from '@/lib/notifications/leadDefaults';

describe('effectiveTaskLeads', () => {
  it('returns ALL presets when custom flag is false', () => {
    expect(
      effectiveTaskLeads({ notifyLeadMinutesTask: [60], notifyLeadCustomTask: false }),
    ).toEqual(TASK_LEAD_PRESETS);
  });

  it('returns user array verbatim when custom flag is true', () => {
    expect(
      effectiveTaskLeads({ notifyLeadMinutesTask: [60, 1440], notifyLeadCustomTask: true }),
    ).toEqual([60, 1440]);
  });

  it('returns empty array when custom is true and array is empty', () => {
    expect(
      effectiveTaskLeads({ notifyLeadMinutesTask: [], notifyLeadCustomTask: true }),
    ).toEqual([]);
  });
});

describe('effectiveEventLeads', () => {
  it('returns ALL presets when custom flag is false', () => {
    expect(
      effectiveEventLeads({ notifyLeadMinutesEvent: [15], notifyLeadCustomEvent: false }),
    ).toEqual(EVENT_LEAD_PRESETS);
  });

  it('returns user array verbatim when custom flag is true', () => {
    expect(
      effectiveEventLeads({ notifyLeadMinutesEvent: [5, 30], notifyLeadCustomEvent: true }),
    ).toEqual([5, 30]);
  });
});
