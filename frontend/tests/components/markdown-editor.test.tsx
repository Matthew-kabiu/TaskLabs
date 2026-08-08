import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';

function EditorHarness() {
  const [value, setValue] = React.useState('Project progress');
  return <MarkdownEditor value={value} onChange={setValue} />;
}

describe('MarkdownEditor', () => {
  it('applies formatting controls to the selected text', () => {
    render(<EditorHarness />);
    const editor = screen.getByRole('textbox', {
      name: 'Markdown editor',
    }) as HTMLTextAreaElement;

    editor.setSelectionRange(0, 7);
    fireEvent.click(screen.getByRole('button', { name: /Bold/ }));

    expect(editor).toHaveValue('**Project** progress');
  });

  it('previews the current Markdown', () => {
    render(<EditorHarness />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '## Weekly update\n\n- Shipped editor' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('heading', { name: 'Weekly update' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Shipped editor');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('MarkdownContent', () => {
  it('renders GitHub-flavored Markdown without rendering raw HTML or images', () => {
    render(
      <MarkdownContent>
        {'- [x] Complete\n\n[TaskLabs](https://example.com)\n\n<img src="https://example.com/tracker.png" />\n\n![tracker](https://example.com/tracker.png)'}
      </MarkdownContent>,
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('link', { name: 'TaskLabs' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
