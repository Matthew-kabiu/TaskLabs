import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const markdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="font-medium underline underline-offset-4 hover:text-muted-foreground"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      className="my-3 border-l-2 border-border pl-3 text-muted-foreground"
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => (
    <code
      {...props}
      className={cn(
        'rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]',
        className,
      )}
    >
      {children}
    </code>
  ),
  h1: ({ children, ...props }) => (
    <h1 {...props} className="mb-2 mt-4 text-lg font-semibold first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="mb-2 mt-4 text-base font-semibold first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">
      {children}
    </h3>
  ),
  hr: (props) => <hr {...props} className="my-4 border-border" />,
  li: ({ children, ...props }) => (
    <li {...props} className="pl-0.5">
      {children}
    </li>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="my-2 list-decimal space-y-1 pl-5">
      {children}
    </ol>
  ),
  p: ({ children, ...props }) => (
    <p {...props} className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="my-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs [&_code]:bg-transparent [&_code]:p-0"
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <table {...props} className="my-3 w-full min-w-96 border-collapse text-left text-xs">
      {children}
    </table>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border border-border px-2 py-1.5 align-top">
      {children}
    </td>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="border border-border bg-muted px-2 py-1.5 font-medium">
      {children}
    </th>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="my-2 list-disc space-y-1 pl-5">
      {children}
    </ul>
  ),
};

interface MarkdownContentProps {
  children: string;
  className?: string;
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn('min-w-0 overflow-x-auto text-sm leading-6', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        disallowedElements={['img']}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
