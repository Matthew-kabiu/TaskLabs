import { describe, expect, it } from 'vitest';
import { deploymentIdentity, maskEmail } from '@/lib/site';

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

describe('maskEmail', () => {
  it('masks the local part while preserving a recognizable prefix and domain', () => {
    expect(maskEmail('saoperson@mail.com')).toBe('sao••••••@mail.com');
  });
});
