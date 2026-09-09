import { describe, it, expect } from 'vitest';
import type { Step } from '../src/core/types.js';

describe('Phase 0 Sanity', () => {
  it('types contract holds', () => {
    const step: Step<{ count: number }> = {
      t: 1.0,
      caption: 'Initial state',
      state: { count: 0 }
    };
    expect(step.t).toBe(1.0);
    expect(step.caption).toBe('Initial state');
  });
});
