'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { hueToHex } from '@/lib/calendar/palette';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  Circle,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

export interface EventChipProps {
  variant: 'event' | 'task';
  title: string;
  colorId?: string | null;
  timeLabel?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  className?: string;
  isOverdue?: boolean;
  isCompleted?: boolean;
}

export function EventChip({
  variant,
  title,
  colorId,
  timeLabel,
  onClick,
  onEdit,
  onDelete,
  onToggleComplete,
  className,
  isOverdue: _isOverdue,
  isCompleted,
}: EventChipProps) {
  const hex = hueToHex(colorId);
  const isSolid = variant === 'event';

  return (
    <div className="group relative flex w-full">
      <button
        type="button"
        data-variant={variant}
        data-completed={isCompleted ? 'true' : undefined}
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-1.5 truncate rounded-md px-2 py-1 text-left text-xs font-medium transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-sm',
          isSolid
            ? 'text-white'
            : 'border border-dashed bg-transparent text-foreground',
          isCompleted && 'opacity-60',
          className,
        )}
        style={
          isSolid
            ? { backgroundColor: hex }
            : { borderColor: 'var(--border)' }
        }
      >
        {isCompleted && (
          <Check className="h-3 w-3 shrink-0" aria-hidden />
        )}
        {!isSolid && !isCompleted && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: hex }}
            aria-hidden
          />
        )}
        {timeLabel && (
          <span className="text-[9px] opacity-80">{timeLabel}</span>
        )}
        <span className={cn('truncate', isCompleted && 'line-through')}>
          {title}
        </span>
      </button>
      {(onEdit || onDelete || onToggleComplete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${title}`}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/20"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onToggleComplete && (
              <DropdownMenuItem onClick={onToggleComplete}>
                {isCompleted ? (
                  <>
                    <Circle className="mr-2 h-3 w-3" />
                    Mark incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-3 w-3" />
                    Mark complete
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
