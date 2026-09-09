// src/core/types.ts — §3.1 authoritative contract

export type Domain = 'travel' | 'food' | 'friends';
export type EngineId = 'gantt' | 'queue' | 'trace' | 'counter' | 'graph' | 'matrix' | 'diagram';

/** One frame of the animation. Produced by an engine, never hand-written. */
export interface Step<S = unknown> {
  /** seconds from timeline start; strictly increasing across the array */
  t: number;
  /** the explanatory text for this step. Present tense, ≤ 120 chars. */
  caption: string;
  /** engine-specific render state at time t */
  state: S;
  /** optional emphasis hint for the renderer, e.g. ['P2', 'edge:R1->P2'] */
  highlight?: string[];
}

export interface Analogy {
  domain: Domain;
  /** 1–2 sentences. Concrete and physical. No metaphor stacking. */
  text: string;
}

export interface Unit<I = unknown, S = unknown> {
  /** 1–89, matches the Atlas inventory */
  id: number;
  lecture: 6 | 7 | 8 | 9 | 10;
  /** url-safe, stable, e.g. 'round-robin' */
  slug: string;
  title: string;
  /** provenance, e.g. 'slides 16–17' */
  slides: string;
  engine: EngineId;
  analogy: Analogy;
  /** 2–4 sentences of plain-language OS explanation shown beside the animation */
  concept: string;
  /** engine-specific input; the engine turns this into Step[] */
  input: I;
}

export interface Lesson<I = unknown, S = unknown> {
  /** 1–20, matches LESSONS.md */
  id: number;
  lecture: 6 | 7 | 8 | 9 | 10;
  /** url-safe, stable, e.g. 'lesson-02' */
  slug: string;
  title: string;
  /** absorbed Atlas units, e.g. [7, 8] */
  absorbsUnits: number[];
  /** provenance, e.g. 'slides 8–9' */
  slides: string;
  engine: EngineId;
  analogy: Analogy;
  /** OS concept explanation */
  concept: string;
  /** What the morph reveals. Required per §3C.2a. */
  morphReveals: string;
  /** 'morph' (default) or 'crossfade' per §3C.2b */
  morphMode?: 'morph' | 'crossfade';
  /** Required if morphMode is 'crossfade' per §3C.2b */
  morphReason?: string;
  /** Optional bulleted mapping between analogy and mechanism */
  analogyMapping?: string[];
  /** engine-specific input */
  input: I;
}

/** Every engine is this shape. Pure. Deterministic. Same input → same output. */
export type Engine<I, S> = (input: I) => Step<S>[];

