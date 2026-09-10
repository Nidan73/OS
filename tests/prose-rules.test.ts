import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────────────────────────────────────────────────────
// The writing rules from STORY.md, enforced instead of trusted.
//
// Two of them exist because good intentions have already failed on this
// project. The words-versus-mechanism defect has recurred seven times, every
// time surviving review because prose reads plausibly. A rule that only lives
// in a document is a rule that comes back.
//
// 1. No em dashes in anything the student reads.
// 2. Every lesson names the real mechanism in its concept text, in the
//    vocabulary the exam will use, and carries a complete analogy mapping.
//    She has to finish able to define the term, not only retell the scene.
// ─────────────────────────────────────────────────────────────────────────────

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', 'src');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });

const rel = (f: string) => path.relative(path.resolve(HERE, '..'), f);

// U+2014, written as an escape so a search-and-replace sweep over this
// repository can never silently rewrite the very character this test looks
// for. It did exactly that once, and the test then started matching hyphens
// and reported 4172 offenders.
const EM_DASH = '\u2014';

describe('prose rule: no em dashes anywhere in src', () => {
  const offenders = walk(SRC)
    .map((f) => ({ f, lines: fs.readFileSync(f, 'utf8').split('\n') }))
    .flatMap(({ f, lines }) =>
      lines
        .map((line, i) => ({ file: rel(f), line: i + 1, text: line }))
        .filter((r) => r.text.includes(EM_DASH))
    );

  it('has none, in copy or in comments', () => {
    const sample = offenders
      .slice(0, 12)
      .map((o) => `${o.file}:${o.line}  ${o.text.trim().slice(0, 90)}`)
      .join('\n');
    expect(
      offenders.length,
      offenders.length
        ? `${offenders.length} em dash(es). Use a full stop, a comma, a colon, or two ` +
          `sentences. En dashes in ranges such as "slides 3–5" are a different ` +
          `character and are fine.\n${sample}`
        : ''
    ).toBe(0);
  });

  it('still permits en dashes, which are numeric ranges and not the banned character', () => {
    // guards the test itself: if someone "fixes" this by banning – too,
    // every slides: and units: field in the project breaks
    expect('slides 3–5').not.toContain(EM_DASH);
    expect('–').not.toBe(EM_DASH);
  });
});

describe('prose rule: every lesson teaches the mechanism, not only the story', () => {
  const lessonFiles = walk(path.join(SRC, 'lessons')).filter((f) =>
    /lesson-\d+\.ts$/.test(f)
  );

  it('finds all 24 lessons', () => {
    expect(lessonFiles).toHaveLength(24);
  });

  /**
   * The exam vocabulary each lesson has to put in front of her at least once.
   * Not a style preference: if she can retell the scene but cannot name the
   * thing, the lesson failed her in the way that is hardest to notice.
   */
  const REQUIRED_TERMS: Record<string, string[]> = {
    'lesson-01': ['CPU burst', 'I/O'],
    'lesson-02': ['first-come', 'convoy'],
    'lesson-03': ['shortest-job-first', 'waiting time'],
    'lesson-04': ['round robin', 'time quantum', 'context switch'],
    'lesson-05': ['priority', 'starvation', 'aging'],
    'lesson-06': ['multilevel feedback', 'queue'],
    'lesson-07': ['multiprocessor', 'core'],
    'lesson-08': ['load balancing', 'affinity'],
    'lesson-09': ['real-time', 'latency', 'deadline'],
    'lesson-10': ['race condition', 'shared'],
    'lesson-11': ['critical section', 'mutual exclusion', 'progress', 'bounded waiting'],
    'lesson-12': ['peterson', 'reorder'],
    'lesson-13': ['atomic', 'test_and_set', 'compare_and_swap'],
    'lesson-14': ['lock', 'spinlock'],
    'lesson-15': ['semaphore', 'wait', 'signal'],
    'lesson-16': ['deadlock', 'dining-philosophers'],
    'lesson-17': ['resource-allocation graph', 'cycle'],
    'lesson-18': ['mutual exclusion', 'hold and wait', 'no preemption', 'circular wait'],
    'lesson-19': ['safe state', 'unsafe', 'safe sequence'],
    'lesson-20': ["banker's algorithm", 'available', 'max', 'allocation', 'need'],
    'lesson-21': ['detection', 'wait-for graph'],
    'lesson-22': ['recovery', 'victim', 'rollback', 'starvation'],
    'lesson-23': ['deterministic', 'queueing', "little's", 'simulation'],
    'lesson-24': ['memory barrier', 'strongly ordered', 'weakly ordered']
  };

  for (const file of lessonFiles) {
    const slug = path.basename(file, '.ts');
    const src = fs.readFileSync(file, 'utf8');

    // The concept text, however it is written: single or double quoted, and
    // concatenated across lines with + once it became long enough to need
    // paragraphs. Two earlier versions of this extraction were wrong (single
    // quotes only, then first-segment only) and both reported lessons as
    // having no concept when they had one. Grab the whole expression, then
    // pull every string literal out of it.
    const conceptExpr = src.match(/\n\s{2}concept:\s*([\s\S]*?),\n\s{2}[a-zA-Z]+:/);
    const concept = conceptExpr
      ? (conceptExpr[1].match(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g) ?? [])
          .map((q) => q.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, ' '))
          .join(' ')
      : '';

    describe(slug, () => {
      it('has a concept long enough to actually explain the mechanism', () => {
        expect(concept.length, `${slug}: concept is ${concept.length} chars`).toBeGreaterThan(200);
      });

      it('names the exam vocabulary in the concept text', () => {
        // Normalise the incidentals so the test checks whether she was taught
        // the term, not whether the author picked the same hyphen as me:
        // curly apostrophes, hyphen vs space, and singular vs plural endings.
        const norm = (t: string) =>
          t
            .toLowerCase()
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[-\u2013]/g, ' ')
            .replace(/\s+/g, ' ');
        const hay = norm(concept);
        const matches = (term: string): boolean => {
          const t = norm(term);
          if (hay.includes(t)) return true;
          // quantum/quanta, matrix/matrices and similar: match the stem
          const stem = t.replace(/(um|us|ix|is|y)$/, '');
          return stem.length >= 5 && hay.includes(stem);
        };
        const missing = (REQUIRED_TERMS[slug] ?? []).filter((term) => !matches(term));
        expect(
          missing,
          missing.length
            ? `${slug} never says: ${missing.join(', ')}. She has to read the real ` +
              `phrase at least once, or she cannot answer the exam question.`
            : ''
        ).toEqual([]);
      });

      it('carries a complete analogy mapping, which is what she revises from', () => {
        const mapping = src.match(/analogyMapping:\s*\[([\s\S]*?)\n\s{2}\]/);
        expect(mapping, `${slug} has no analogyMapping`).not.toBeNull();
        // both quote styles: lesson-07 uses double quotes and an earlier
        // version of this test reported it as having no mapping rows at all
        const rows = (
          mapping![1].match(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g) ?? []
        ).map((r) => r.slice(1, -1));
        expect(rows.length, `${slug} mapping rows`).toBeGreaterThanOrEqual(4);
        for (const row of rows) {
          expect(row, `${slug}: "${row}" is not a scene ➔ mechanism pair`).toContain('➔');
          const [scene, mech] = row.split('➔').map((x) => x.trim());
          expect(scene.length, `${slug}: empty scene side in "${row}"`).toBeGreaterThan(2);
          expect(mech.length, `${slug}: empty mechanism side in "${row}"`).toBeGreaterThan(2);
        }
      });
    });
  }
});
