import type { EngineId, Unit, Lesson } from './types.js';
import { AnimationEngine } from './engine.js';
import { GanttEngine } from '../engines/gantt.js';
import { QueueEngine } from '../engines/queue.js';

export type EngineConstructor = new (container: HTMLElement, input: any) => AnimationEngine<any, any>;

const engineRegistry: Partial<Record<EngineId, EngineConstructor>> = {
  gantt: GanttEngine as any,
  queue: QueueEngine as any
};

// Vite lazy glob mapping for dynamic unit and lesson loading (§3A.3)
const unitModules = import.meta.glob('../units/**/*.ts');
const lessonModules = import.meta.glob('../lessons/**/*.ts');

export function registerEngine(id: EngineId, ctor: EngineConstructor): void {
  engineRegistry[id] = ctor;
}

export function getEngine(id: EngineId): EngineConstructor | undefined {
  return engineRegistry[id];
}

/**
 * Dynamic unit loader (§3A.3).
 * Loads unit modules dynamically at route time so one bad file cannot break the index.
 */
export async function loadUnitDynamically(lectureFolder: string, slug: string): Promise<Unit<any, any> | null> {
  const path = `../units/${lectureFolder}/${slug}.ts`;
  const loader = unitModules[path];
  if (!loader) {
    return null;
  }
  try {
    const mod = (await loader()) as { default?: Unit<any, any>; unit?: Unit<any, any> };
    return mod.unit || mod.default || null;
  } catch (err) {
    console.error(`Failed to dynamically import unit module ${path}:`, err);
    throw err;
  }
}

/**
 * Dynamic lesson loader (§3C).
 */
export async function loadLessonDynamically(lectureFolder: string, slug: string): Promise<Lesson<any, any> | null> {
  const path = `../lessons/${lectureFolder}/${slug}.ts`;
  const loader = lessonModules[path];
  if (!loader) {
    return null;
  }
  try {
    const mod = (await loader()) as { default?: Lesson<any, any>; lesson?: Lesson<any, any>; [k: string]: any };
    return mod.lesson || mod.default || mod.lesson02 || null;
  } catch (err) {
    console.error(`Failed to dynamically import lesson module ${path}:`, err);
    throw err;
  }
}

export function renderFallback(container: HTMLElement, unit: Partial<Unit<any, any>> & { id?: number; title?: string; slug?: string; lecture?: number; slides?: string; engine?: string }, error: unknown): void {
  container.replaceChildren();
  const card = document.createElement('div');
  card.className = 'unit-error-card';
  card.setAttribute('role', 'alert');
  card.style.padding = 'calc(var(--step) * 3)';
  card.style.border = '2px solid var(--accent)';
  card.style.borderRadius = '8px';
  card.style.background = 'var(--surface)';
  card.style.color = 'var(--ink)';

  const heading = document.createElement('h2');
  heading.style.color = 'var(--accent)';
  heading.style.marginBottom = 'var(--step)';
  heading.textContent = `Unit/Lesson ${unit.id ?? '?'}: ${unit.title ?? unit.slug ?? 'Unknown'} failed to load`;

  const msg = document.createElement('p');
  msg.style.marginBottom = 'var(--step)';
  msg.textContent = error instanceof Error ? error.message : String(error);

  const meta = document.createElement('small');
  meta.style.color = 'var(--muted)';
  meta.textContent = `Lecture ${unit.lecture ?? '?'} · ${unit.slides ?? ''} · Engine: ${unit.engine ?? '?'}`;

  card.append(heading, msg, meta);
  container.appendChild(card);
}

export function mountUnit(unit: Unit<any, any>, container: HTMLElement): AnimationEngine<any, any> | null {
  try {
    const EngineCtor = engineRegistry[unit.engine];
    if (!EngineCtor) {
      throw new Error(`Unknown or unregistered engine "${unit.engine}"`);
    }
    const engine = new EngineCtor(container, unit.input);
    engine.init();
    return engine;
  } catch (err) {
    console.error(`[unit ${unit.id} · ${unit.slug}]`, err);
    renderFallback(container, unit, err);
    return null;
  }
}

export function mountLesson(lesson: Lesson<any, any>, container: HTMLElement, initialView = 0): AnimationEngine<any, any> | null {
  try {
    const EngineCtor = engineRegistry[lesson.engine];
    if (!EngineCtor) {
      throw new Error(`Unknown or unregistered engine "${lesson.engine}"`);
    }
    const engine = new EngineCtor(container, lesson.input);
    engine.init(initialView);
    return engine;
  } catch (err) {
    console.error(`[lesson ${lesson.id} · ${lesson.slug}]`, err);
    renderFallback(container, lesson, err);
    return null;
  }
}
