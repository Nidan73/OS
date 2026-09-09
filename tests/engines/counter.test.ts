import { describe, it, expect, beforeEach } from 'vitest';
import { CounterEngine, type CounterInput } from '../../src/engines/counter.js';

describe('CounterEngine Lifecycle & Resource Pool (§3A, §4.4)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const sampleInput: CounterInput = {
    initial: 1,
    capacity: 1,
    mode: 'block',
    actors: [
      { id: 'T1', name: 'Thread 1' },
      { id: 'T2', name: 'Thread 2' }
    ],
    events: [
      { actorId: 'T1', action: 'acquire', caption: 'T1 acquires mutex' },
      { actorId: 'T2', action: 'acquire', caption: 'T2 blocked on mutex' },
      { actorId: 'T1', action: 'release', caption: 'T1 releases mutex, waking T2' }
    ]
  };

  it('mounts counter meter, holders slot, and waiting queue', () => {
    const engine = new CounterEngine(container, sampleInput);
    engine.init(0);

    expect(container.querySelector('svg')).not.toBeNull();
    const actors = container.querySelectorAll('[id^="bar-"]');
    expect(actors.length).toBe(2); // bar-T1, bar-T2
    engine.destroy();
  });

  it('transitions state correctly through acquire, block, and release', () => {
    const engine = new CounterEngine(container, sampleInput);
    engine.init(0);

    const steps = engine.getSteps();
    expect(steps.length).toBe(4); // t=0 + 3 events

    // Step 1: T1 acquires -> value 0, holders: [T1]
    expect(steps[1].state.value).toBe(0);
    expect(steps[1].state.holders).toEqual(['T1']);

    // Step 2: T2 blocked -> value -1, holders: [T1], waiting: [T2]
    expect(steps[2].state.value).toBe(-1);
    expect(steps[2].state.holders).toEqual(['T1']);
    expect(steps[2].state.waiting).toEqual(['T2']);

    // Step 3: T1 releases -> value 0, T2 woke up -> holders: [T2], waiting: []
    expect(steps[3].state.value).toBe(0);
    expect(steps[3].state.holders).toEqual(['T2']);
    expect(steps[3].state.waiting).toEqual([]);

    engine.destroy();
  });
});
