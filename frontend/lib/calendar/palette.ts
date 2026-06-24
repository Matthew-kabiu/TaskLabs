export const EVENT_HUES = [
  { id: 'slate',  label: 'Slate',  hex: '#64748b' },
  { id: 'red',    label: 'Red',    hex: '#ef4444' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'amber',  label: 'Amber',  hex: '#f59e0b' },
  { id: 'green',  label: 'Green',  hex: '#22c55e' },
  { id: 'teal',   label: 'Teal',   hex: '#14b8a6' },
  { id: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
] as const;

export type EventHueId = (typeof EVENT_HUES)[number]['id'];

export const EVENT_HUE_IDS = EVENT_HUES.map((h) => h.id) as readonly EventHueId[];

export function hueToHex(id: EventHueId | string | null | undefined): string {
  const hit = EVENT_HUES.find((h) => h.id === id);
  return hit ? hit.hex : EVENT_HUES[0].hex;
}
