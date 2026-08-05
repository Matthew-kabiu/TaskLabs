import { render, screen } from '@testing-library/react';
import { FolderKanban } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '@/components/dashboard/stat-card';

describe('StatCard', () => {
  it('renders as an accessible deep link', () => {
    render(
      <StatCard
        icon={FolderKanban}
        label="In Progress"
        value={3}
        href="/projects?status=IN_PROGRESS"
      />,
    );

    const link = screen.getByRole('link', {
      name: 'In Progress: 3. View details',
    });
    expect(link).toHaveAttribute('href', '/projects?status=IN_PROGRESS');
    expect(link).toHaveClass('cursor-pointer');
  });
});
