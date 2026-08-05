import {
  Database,
  FileInput,
  Globe2,
  Link2,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ProjectPriority, ProjectResourceType, ProjectStatus } from '@/hooks/useProjects';

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; dot: string; ring: string }
> = {
  PLANNING: { label: 'Planning', dot: 'bg-sky-500', ring: 'ring-sky-500/30' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
  ON_HOLD: { label: 'On Hold', dot: 'bg-zinc-400', ring: 'ring-zinc-400/30' },
  COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-rose-500', ring: 'ring-rose-500/30' },
  ARCHIVED: { label: 'Archived', dot: 'bg-stone-500', ring: 'ring-stone-500/30' },
};

export const PROJECT_PRIORITY_META: Record<
  ProjectPriority,
  { label: string; dot: string; text: string }
> = {
  LOW: { label: 'Low', dot: 'bg-sky-500', text: 'text-sky-500' },
  MEDIUM: { label: 'Medium', dot: 'bg-amber-500', text: 'text-amber-500' },
  HIGH: { label: 'High', dot: 'bg-orange-500', text: 'text-orange-500' },
  URGENT: { label: 'Urgent', dot: 'bg-rose-500', text: 'text-rose-500' },
};

export const PROJECT_RESOURCE_TYPE_META: Record<
  ProjectResourceType,
  { label: string; icon: LucideIcon }
> = {
  WEBSITE: { label: 'Website', icon: Globe2 },
  FORM: { label: 'Form', icon: FileInput },
  DATABASE: { label: 'Database', icon: Database },
  GITHUB: { label: 'GitHub', icon: Link2 },
  COMMUNICATION: { label: 'Communication', icon: MessageCircle },
  CUSTOM: { label: 'Custom', icon: Link2 },
};

export function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
    />
  );
}
