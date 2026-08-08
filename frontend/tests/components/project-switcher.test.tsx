import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSwitcher } from '@/components/projects/project-switcher';

const projects = [
  { id: 'p1', title: 'Website redesign', status: 'PLANNING' as const },
  { id: 'p2', title: 'Mobile app launch', status: 'IN_PROGRESS' as const },
];

describe('ProjectSwitcher', () => {
  it('shows the active project and switches projects', () => {
    const onSelect = vi.fn();
    render(
      <ProjectSwitcher
        projects={projects}
        activeId="p1"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Active project')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mobile app launch'));

    expect(onSelect).toHaveBeenCalledWith('p2');
  });

  it('keeps the compact trigger accessible', () => {
    render(
      <ProjectSwitcher
        projects={projects}
        activeId="p2"
        onSelect={() => {}}
        compact
      />,
    );

    const trigger = screen.getByRole('combobox', {
      name: 'Active project: Mobile app launch',
    });
    expect(trigger).toHaveAttribute('data-status', 'IN_PROGRESS');
    expect(trigger).toHaveClass('bg-amber-500/10', 'text-amber-500');
  });
});
