import { describe, expect, it } from 'vitest';
import { deploymentIdentity } from '@/lib/site';

describe('deploymentIdentity', () => {
  it('keeps the development identity unchanged', () => {
    expect(deploymentIdentity('development', '')).toEqual({
      version: 'V0.1.0',
      environment: 'DEV',
      origin: 'LOCALHOST:3000',
    });
  });

  it('uses the registrable domain label in production', () => {
    expect(
      deploymentIdentity('production', 'https://tasklabs.spookielabsinc.site'),
    ).toEqual({
      version: 'V0.1.0',
      environment: 'PROD',
      origin: 'SPOOKIELABSINC',
    });
  });
});
