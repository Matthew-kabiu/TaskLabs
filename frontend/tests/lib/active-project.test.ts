import { beforeEach, describe, expect, it } from 'vitest';
import { useActiveProjectStore } from '@/lib/stores/active-project';

describe('active project store', () => {
  beforeEach(() => {
    useActiveProjectStore.setState({ activeProjectIds: {} });
  });

  it('keeps project selections isolated by workspace', () => {
    const state = useActiveProjectStore.getState();
    state.setActiveProjectId('w1', 'p1');
    state.setActiveProjectId('w2', 'p2');

    expect(useActiveProjectStore.getState().activeProjectIds).toEqual({
      w1: 'p1',
      w2: 'p2',
    });
  });

  it('clears only the selected workspace', () => {
    useActiveProjectStore.setState({
      activeProjectIds: { w1: 'p1', w2: 'p2' },
    });

    useActiveProjectStore.getState().clearActiveProjectId('w1');

    expect(useActiveProjectStore.getState().activeProjectIds).toEqual({ w2: 'p2' });
  });
});
