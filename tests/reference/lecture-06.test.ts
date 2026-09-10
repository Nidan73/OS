import { describe, it, expect } from 'vitest';
import { renderLecture06Reference } from '../../src/reference/lecture-06.js';
import { fcfs, type Process } from '../../src/algorithms/scheduling.js';

describe('Lecture 6 Reference Page — Scheduling Criteria', () => {
  const canonicalProcesses: Process[] = [
    { id: 'P1', arrival: 0, burst: 24 },
    { id: 'P2', arrival: 0, burst: 3 },
    { id: 'P3', arrival: 0, burst: 3 }
  ];

  it('renders an HTMLElement with main.reference-page container', () => {
    const el = renderLecture06Reference();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('main');
    expect(el.classList.contains('reference-page')).toBe(true);
  });

  it('defines all five scheduling criteria with formal definitions and ranges', () => {
    const el = renderLecture06Reference();
    const text = el.textContent || '';

    // 1. CPU Utilisation
    expect(text).toContain('CPU Utilisation');
    expect(text).toMatch(/0%\s*to\s*100%/i);
    expect(text).toMatch(/40%\s*\(light load\)/i);
    expect(text).toMatch(/90%\s*\(heavy load\)/i);

    // 2. Throughput
    expect(text).toContain('Throughput');
    expect(text).toMatch(/1\s*process\/hour/i);
    expect(text).toMatch(/10\s*processes\/sec/i);

    // 3. Turnaround Time
    expect(text).toContain('Turnaround Time');
    expect(text).toMatch(/submission of a process to completion/i);
    expect(text).toMatch(/ready queue waiting time \+ CPU execution burst \+ I\/O/i);

    // 4. Waiting Time
    expect(text).toContain('Waiting Time');
    expect(text).toMatch(/sum of periods spent waiting in the ready queue/i);
    expect(text).toMatch(/Scheduling algorithms do NOT affect CPU execution time or I\/O time;\s*they directly affect waiting time/i);

    // 5. Response Time
    expect(text).toContain('Response Time');
    expect(text).toMatch(/time to start responding, not time to output full response/i);
  });

  it('includes optimization criteria (max/min goals, average vs extremes, predictability)', () => {
    const el = renderLecture06Reference();
    const text = el.textContent || '';

    // Maximize vs Minimize goals
    expect(text).toMatch(/CPU Utilisation[\s\S]*?Maximize/i);
    expect(text).toMatch(/Throughput[\s\S]*?Maximize/i);
    expect(text).toMatch(/Turnaround Time[\s\S]*?Minimize/i);
    expect(text).toMatch(/Waiting Time[\s\S]*?Minimize/i);
    expect(text).toMatch(/Response Time[\s\S]*?Minimize/i);

    // Average vs Extremes trade-off
    expect(text).toContain('Average vs Extremes');
    expect(text).toMatch(/minimizing maximum response time/i);
    expect(text).toMatch(/fair service/i);

    // Predictability & Variance trade-off
    expect(text).toContain('Predictability & Variance');
    expect(text).toMatch(/low variance in response time/i);
  });

  it('re-casts analogies into the household kitchen and dinner service register', () => {
    const el = renderLecture06Reference();
    const text = el.textContent || '';

    // Kitchen stove and oven (CPU utilisation)
    expect(text).toMatch(/kitchen stove and oven are actively cooking dinner rather than sitting cold and unlit/i);

    // Courses delivered per hour (Throughput)
    expect(text).toMatch(/complete dinner courses or family plates are completed and delivered from the kitchen per hour/i);

    // Order to clean plate (Turnaround time)
    expect(text).toMatch(/Abbu or Arijit asks for a meal until the plate is completely finished and cleared/i);

    // Fork-in-hand wait (Waiting time)
    expect(text).toMatch(/sitting at the dining table with an empty fork, waiting for the dish to be prepared/i);

    // Appetizer arrival (Response time)
    expect(text).toMatch(/first cup of soup,\s*appetizer,\s*or warm bread is served to the table/i);
  });

  it('computes every number from pure scheduling algorithm fcfs', () => {
    const el = renderLecture06Reference();
    const schedule = fcfs(canonicalProcesses);
    const totalBurst = canonicalProcesses.reduce((acc, p) => acc + p.burst, 0);
    const cpuUtilization = (totalBurst / schedule.totalTime) * 100;
    const throughput = canonicalProcesses.length / schedule.totalTime;

    const text = el.textContent || '';

    // Computed total time
    expect(schedule.totalTime).toBe(30);
    expect(text).toContain(`${schedule.totalTime} ms`);

    // Computed waiting times (P1=0, P2=24, P3=27, avg=17)
    expect(schedule.waiting['P1']).toBe(0);
    expect(schedule.waiting['P2']).toBe(24);
    expect(schedule.waiting['P3']).toBe(27);
    expect(schedule.avgWaiting).toBe(17);

    expect(text).toContain(`${schedule.avgWaiting.toFixed(2)} ms`);
    expect(text).toContain(`${schedule.avgWaiting.toFixed(1)} ms`);

    // Computed turnaround times (P1=24, P2=27, P3=30, avg=27)
    expect(schedule.turnaround['P1']).toBe(24);
    expect(schedule.turnaround['P2']).toBe(27);
    expect(schedule.turnaround['P3']).toBe(30);
    expect(schedule.avgTurnaround).toBe(27);

    expect(text).toContain(`${schedule.avgTurnaround.toFixed(2)} ms`);
    expect(text).toContain(`${schedule.avgTurnaround.toFixed(1)} ms`);

    // Computed response times (P1=0, P2=24, P3=27, avg=17)
    expect(schedule.response['P1']).toBe(0);
    expect(schedule.response['P2']).toBe(24);
    expect(schedule.response['P3']).toBe(27);
    expect(schedule.avgResponse).toBe(17);

    expect(text).toContain(`${schedule.avgResponse.toFixed(2)} ms`);

    // Computed utilization and throughput
    expect(cpuUtilization).toBe(100);
    expect(text).toContain(`${cpuUtilization.toFixed(1)}%`);
    expect(text).toContain(throughput.toFixed(2));
  });

  it('renders a static SVG diagram illustrating the Gantt timeline', () => {
    const el = renderLecture06Reference();
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();

    // Verify SVG attributes
    expect(svg?.getAttribute('viewBox')).toBeTruthy();
    expect(svg?.getAttribute('role')).toBe('img');

    // Verify Gantt bars for all processes
    const p1Bar = svg?.querySelector('[data-process="P1"]');
    const p2Bar = svg?.querySelector('[data-process="P2"]');
    const p3Bar = svg?.querySelector('[data-process="P3"]');

    expect(p1Bar).not.toBeNull();
    expect(p2Bar).not.toBeNull();
    expect(p3Bar).not.toBeNull();

    // Verify timeline tick marks for time endpoints
    const svgText = svg?.textContent || '';
    expect(svgText).toContain('0');
    expect(svgText).toContain('24');
    expect(svgText).toContain('27');
    expect(svgText).toContain('30');
    expect(svgText).toContain('P1');
    expect(svgText).toContain('P2');
    expect(svgText).toContain('P3');
  });

  it('uses alternating section backgrounds and follows design tokens', () => {
    const el = renderLecture06Reference();
    const sections = el.querySelectorAll<HTMLElement>('.ref-section');
    expect(sections.length).toBeGreaterThanOrEqual(5);

    // Verify alternating surfaces
    const surfaceClasses = Array.from(sections).map(s =>
      s.classList.contains('bg-surface') ? 'surface' : s.classList.contains('bg-surface-alt') ? 'alt' : 'other'
    );
    expect(surfaceClasses[0]).toBe('surface');
    expect(surfaceClasses[1]).toBe('alt');
    expect(surfaceClasses[2]).toBe('surface');
    expect(surfaceClasses[3]).toBe('alt');
    expect(surfaceClasses[4]).toBe('surface');

    // Verify token usage in styles
    const styleEl = el.querySelector('style');
    expect(styleEl).not.toBeNull();
    const cssText = styleEl?.textContent || '';
    expect(cssText).toContain('var(--surface)');
    expect(cssText).toContain('var(--surface-alt)');
    expect(cssText).toContain('var(--ink)');
    expect(cssText).toContain('var(--accent)');
    expect(cssText).toContain('var(--step)');
  });

  it('contains zero forbidden jargon in textContent and innerHTML', () => {
    const el = renderLecture06Reference();
    const text = el.textContent || '';
    const html = el.innerHTML;

    const forbiddenPatterns: { name: string; regex: RegExp }[] = [
      { name: 'section symbol (§)', regex: /§\s*\d|§/ },
      { name: 'Atlas unit / Atlas', regex: /\bAtlas unit\b|\bAtlas\b/i },
      { name: 'ABSORBS', regex: /\bABSORBS\b/i },
      { name: 'isomorph / isomorphic', regex: /\bisomorph/i },
      { name: 'SPEC.md / SPEC', regex: /\bSPEC\.md\b|\bSPEC\b/i },
      { name: 'view = 0/1', regex: /\bview\s*=\s*[01]\b/i },
      { name: 'morphMode / morph', regex: /\bmorphMode\b|\bmorph\b/i },
      { name: 'engine', regex: /\bengine\b(?!ering)/i },
      { name: 'engine keyword strictly', regex: /\bengine\b/i },
      { name: 'prototype patching', regex: /prototype\s+as\s+any/ }
    ];

    for (const { name, regex } of forbiddenPatterns) {
      expect(text, `Forbidden jargon found in text: ${name}`).not.toMatch(regex);
      expect(html, `Forbidden jargon found in html: ${name}`).not.toMatch(regex);
    }
  });
});
