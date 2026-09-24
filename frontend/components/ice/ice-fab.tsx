'use client';

import { useState } from 'react';
import { Snowflake, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IcePanel } from '@/components/ice/ice-panel';

/**
 * Ice chatbot entry point: a floating action button toggling a docked chat
 * window. Mounted once in the app shell so it is available on every
 * authenticated screen without taking a sidebar slot.
 */
export function IceFab() {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      {open && (
        <section
          aria-label="Ice chat"
          className="fixed right-4 bottom-20 z-40 flex h-[60vh] max-h-[60vh] min-h-[320px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-border bg-card md:right-6"
        >
          <IcePanel onClose={() => setOpen(false)} />
        </section>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            aria-label={open ? 'Close Ice chat' : 'Open Ice chat'}
            onClick={() => setOpen((value) => !value)}
            className="fixed right-6 bottom-6 z-40 size-12 rounded-full shadow-sm"
          >
            {open ? <X className="size-5" /> : <Snowflake className="size-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{open ? 'Close Ice' : 'Ask Ice'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
