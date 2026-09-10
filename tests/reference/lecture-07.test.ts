import { describe, it, expect } from 'vitest';
import { renderLecture07Reference } from '../../src/reference/lecture-07.js';

describe('Lecture 7 Reference Page', () => {
  it('returns a valid HTMLElement with reference-page class', () => {
    const el = renderLecture07Reference();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('main');
    expect(el.classList.contains('reference-page')).toBe(true);
  });

  it('defines and contrasts PCS and SCS', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    // Verify Process-Contention Scope (PCS) coverage
    expect(text).toContain('Process-Contention Scope');
    expect(text).toContain('PCS');
    expect(text).toContain('User-level threads');
    expect(text).toContain('Lightweight Process');
    expect(text).toContain('LWP');
    expect(text).toContain('same process');

    // Verify System-Contention Scope (SCS) coverage
    expect(text).toContain('System-Contention Scope');
    expect(text).toContain('SCS');
    expect(text).toContain('physical CPU');
    expect(text).toContain('entire system');
    expect(text).toContain('1:1');
  });

  it('explains Pthreads scheduling API with code block and Linux NPTL behavior', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    // Verify POSIX function names and scope macros
    expect(text).toContain('pthread_attr_setscope');
    expect(text).toContain('pthread_attr_getscope');
    expect(text).toContain('PTHREAD_SCOPE_PROCESS');
    expect(text).toContain('PTHREAD_SCOPE_SYSTEM');
    expect(text).toContain('ENOTSUP');
    expect(text).toContain('NPTL');

    // Verify presence of code block
    const codeElements = el.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
    const preElement = el.querySelector('pre');
    expect(preElement).not.toBeNull();
    const preText = preElement?.textContent || '';
    expect(preText).toContain('pthread_attr_init');
    expect(preText).toContain('pthread_attr_setscope');
    expect(preText).toContain('PTHREAD_SCOPE_SYSTEM');
    expect(preText).toContain('pthread_create');
  });

  it('covers Linux CFS, vruntime, nice values, and real-time scheduling', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    expect(text).toContain('Linux');
    expect(text).toContain('Completely Fair Scheduler');
    expect(text).toContain('CFS');
    expect(text).toContain('vruntime');
    expect(text).toContain('red-black tree');
    expect(text).toContain('nice');
    expect(text).toContain('-20');
    expect(text).toContain('+19');
    expect(text).toContain('40');
    expect(text).toContain('SCHED_FIFO');
    expect(text).toContain('SCHED_RR');
    expect(text).toContain('100');
  });

  it('covers Windows 32 priority levels, classes, and dynamic boosting', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    expect(text).toContain('Windows');
    expect(text).toContain('32');
    expect(text).toContain('Zero-Page');
    expect(text).toContain('Variable');
    expect(text).toContain('Real-time');
    expect(text).toContain('Foreground');
    expect(text).toContain('I/O');
    expect(text).toContain('Anti-starvation');
    expect(text).toContain('Balance Set Manager');
    expect(text).toContain('4');
    expect(text).toContain('quantums');
  });

  it('covers Solaris scheduling classes, dispatch tables, and inverse quantum', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    expect(text).toContain('Solaris');
    expect(text).toContain('Time-Sharing');
    expect(text).toContain('TS');
    expect(text).toContain('Interactive');
    expect(text).toContain('IA');
    expect(text).toContain('Real-Time');
    expect(text).toContain('RT');
    expect(text).toContain('System');
    expect(text).toContain('SYS');
    expect(text).toContain('Fair-Share');
    expect(text).toContain('FSS');
    expect(text).toContain('dispatch table');
    expect(text).toContain('160');
    expect(text).toContain('20ms');
    expect(text).toContain('200ms');
  });

  it('presents the household dining analogy correctly', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';

    expect(text).toMatch(/booth/i);
    expect(text).toMatch(/kitchen/i);
    expect(text).toMatch(/ticket|order/i);
    expect(text).toMatch(/family|father|sister/i);
  });

  it('renders static SVG architecture and comparison diagrams', () => {
    const el = renderLecture07Reference();
    const svgs = el.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);

    // Verify architecture diagram features
    const archSvg = svgs[1]; // First major diagram
    expect(archSvg.getAttribute('viewBox')).toBeTruthy();
    expect(archSvg.querySelectorAll('rect').length).toBeGreaterThan(5);
    expect(archSvg.querySelectorAll('text').length).toBeGreaterThan(5);
  });

  it('has zero forbidden jargon in textContent and innerHTML', () => {
    const el = renderLecture07Reference();
    const text = el.textContent || '';
    const html = el.innerHTML;

    const JARGON = [
      /§\s*\d/,
      /\bAtlas unit/i,
      /\bABSORBS\b/i,
      /\bisomorph/i,
      /\bSPEC\.md\b/i,
      /\bview\s*=\s*[01]\b/i,
      /\bmorphMode\b/,
      /\bengine\b(?!ering)/i,
    ];

    for (const rx of JARGON) {
      expect(text).not.toMatch(rx);
      expect(html).not.toMatch(rx);
    }
  });

  it('maintains full Apple density with alternating sections', () => {
    const el = renderLecture07Reference();
    const hero = el.querySelector('.ref-hero');
    const altSections = el.querySelectorAll('.ref-section-alt');
    const surfaceSections = el.querySelectorAll('.ref-section-surface');

    expect(hero).not.toBeNull();
    expect(altSections.length).toBeGreaterThanOrEqual(2);
    expect(surfaceSections.length).toBeGreaterThanOrEqual(2);
  });
});
