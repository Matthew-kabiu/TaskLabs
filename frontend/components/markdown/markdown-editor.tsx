'use client';

import * as React from 'react';
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from 'lucide-react';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const INLINE_ACTIONS = {
  bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
  italic: { prefix: '_', suffix: '_', placeholder: 'italic text' },
  code: { prefix: '`', suffix: '`', placeholder: 'code' },
  link: { prefix: '[', suffix: '](https://)', placeholder: 'link text' },
} as const;

const LINE_ACTIONS = {
  heading: '## ',
  bullet: '- ',
  ordered: '1. ',
  quote: '> ',
} as const;

type InlineAction = keyof typeof INLINE_ACTIONS;
type LineAction = keyof typeof LINE_ACTIONS;

interface FormattingButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  shortcut?: string;
}

function FormattingButton({
  label,
  icon,
  onClick,
  disabled,
  shortcut,
}: FormattingButtonProps) {
  const accessibleLabel = shortcut ? `${label} (${shortcut})` : label;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      {icon}
    </Button>
  );
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  maxLength = 10_000,
  placeholder = 'Write an update…',
  ariaLabel = 'Markdown editor',
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<'write' | 'preview'>('write');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const restoreSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start, end);
    });
  };

  const applyInline = (action: InlineAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const { prefix, suffix, placeholder: fallback } = INLINE_ACTIONS[action];
    const selection = value.slice(selectionStart, selectionEnd) || fallback;
    const replacement = `${prefix}${selection}${suffix}`;
    const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;
    if (nextValue.length > maxLength) return;

    onChange(nextValue);
    restoreSelection(selectionStart + prefix.length, selectionStart + prefix.length + selection.length);
  };

  const applyLinePrefix = (action: LineAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
    const nextBreak = value.indexOf('\n', selectionEnd);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selection = value.slice(lineStart, lineEnd);
    const prefix = LINE_ACTIONS[action];
    const replacement = selection
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    const nextValue = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
    if (nextValue.length > maxLength) return;

    onChange(nextValue);
    restoreSelection(lineStart + prefix.length, lineStart + replacement.length);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const action = event.key.toLowerCase();
    if (action === 'b' || action === 'i' || action === 'k') {
      event.preventDefault();
      applyInline(action === 'b' ? 'bold' : action === 'i' ? 'italic' : 'link');
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-md border border-border/60 bg-background', className)}>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-1 border-b border-border/60 bg-muted/30 px-1.5 py-1">
        <div className="flex flex-wrap items-center gap-0.5" aria-label="Markdown formatting controls">
          <FormattingButton
            label="Bold"
            icon={<Bold />}
            onClick={() => applyInline('bold')}
            disabled={mode !== 'write'}
            shortcut="Ctrl+B"
          />
          <FormattingButton
            label="Italic"
            icon={<Italic />}
            onClick={() => applyInline('italic')}
            disabled={mode !== 'write'}
            shortcut="Ctrl+I"
          />
          <FormattingButton
            label="Heading"
            icon={<Heading2 />}
            onClick={() => applyLinePrefix('heading')}
            disabled={mode !== 'write'}
          />
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
          <FormattingButton
            label="Bulleted list"
            icon={<List />}
            onClick={() => applyLinePrefix('bullet')}
            disabled={mode !== 'write'}
          />
          <FormattingButton
            label="Numbered list"
            icon={<ListOrdered />}
            onClick={() => applyLinePrefix('ordered')}
            disabled={mode !== 'write'}
          />
          <FormattingButton
            label="Quote"
            icon={<Quote />}
            onClick={() => applyLinePrefix('quote')}
            disabled={mode !== 'write'}
          />
          <FormattingButton
            label="Inline code"
            icon={<Code2 />}
            onClick={() => applyInline('code')}
            disabled={mode !== 'write'}
          />
          <FormattingButton
            label="Link"
            icon={<Link />}
            onClick={() => applyInline('link')}
            disabled={mode !== 'write'}
            shortcut="Ctrl+K"
          />
        </div>

        <div className="flex items-center rounded-md bg-muted p-0.5" aria-label="Editor mode">
          <Button
            type="button"
            variant={mode === 'write' ? 'outline' : 'ghost'}
            size="sm"
            className="h-6 gap-1 px-2 shadow-none"
            onClick={() => setMode('write')}
            aria-pressed={mode === 'write'}
          >
            <Pencil className="h-3 w-3" /> Write
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'outline' : 'ghost'}
            size="sm"
            className="h-6 gap-1 px-2 shadow-none"
            onClick={() => setMode('preview')}
            aria-pressed={mode === 'preview'}
          >
            <Eye className="h-3 w-3" /> Preview
          </Button>
        </div>
      </div>

      {mode === 'write' ? (
        <Textarea
          ref={textareaRef}
          aria-label={ariaLabel}
          className="min-h-40 resize-y rounded-none border-0 px-3 py-2 text-sm leading-6 shadow-none focus-visible:ring-0"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
        />
      ) : (
        <div className="min-h-40 p-3">
          {value.trim() ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Markdown supported</span>
        <span className="tabular-nums">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
