import { describe, it, expect, beforeEach } from 'vitest';
import { TraceEngine, type TraceInput } from '../../src/engines/trace.js';

describe('TraceEngine Lifecycle & Interleaving (§3A, §4.3)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const sampleInput: TraceInput = {
    threads: [
      { id: 'T1', name: 'Thread 1', instructions: ['register1 = counter', 'register1 = register1 + 1', 'counter = register1'] },
      { id: 'T2', name: 'Thread 2', instructions: ['register2 = counter', 'register2 = register2 - 1', 'counter = register2'] }
    ],
    interleaving: [0, 1, 0, 0, 1, 1], // Race condition pattern: T1:read, T2:read, T1:add, T1:write, T2:sub, T2:write
    initial: { counter: 5 }
  };

  it('mounts instruction columns and memory display', () => {
    const engine = new TraceEngine(container, sampleInput);
    engine.init(0);

    expect(container.querySelector('svg')).not.toBeNull();
    const cols = container.querySelectorAll('[id^="bar-"]');
    expect(cols.length).toBe(2); // bar-T1, bar-T2
    engine.destroy();
  });

  it('computes exact register snapshots and final counter = 4 (§2.1)', () => {
    const engine = new TraceEngine(container, sampleInput);
    engine.init(0);

    const steps = engine.getSteps();
    expect(steps.length).toBe(7); // t=0 + 6 instructions

    // Final step state
    const finalState = steps[steps.length - 1].state;
    expect(finalState.memory.counter).toBe(4);
    expect(finalState.registers.R1).toBe(6);
    expect(finalState.registers.R2).toBe(4);

    engine.destroy();
  });
});
