import type { EngineId, Unit } from './types.js';
import { AnimationEngine } from './engine.js';

export type EngineConstructor = new (container: HTMLElement, input: any) => AnimationEngine<any, any>;

const engineRegistry: Partial<Record<EngineId, EngineConstructor>> = {};
const unitRegistry: Map<number, Unit<any, any>> = new Map();
const unitSlugMap: Map<string, Unit<any, any>> = new Map();

export function registerEngine(id: EngineId, ctor: EngineConstructor): void {
  engineRegistry[id] = ctor;
}

export function getEngine(id: EngineId): EngineConstructor | undefined {
  return engineRegistry[id];
}

export function registerUnit(unit: Unit<any, any>): void {
  unitRegistry.set(unit.id, unit);
  unitSlugMap.set(unit.slug, unit);
}

export function getUnitById(id: number): Unit<any, any> | undefined {
  return unitRegistry.get(id);
}

export function getUnitBySlug(slug: string): Unit<any, any> | undefined {
  return unitSlugMap.get(slug);
}

export function getAllUnits(): Unit<any, any>[] {
  return Array.from(unitRegistry.values()).sort((a, b) => a.id - b.id);
}

export function renderFallback(container: HTMLElement, unit: Unit<any, any>, error: unknown): void {
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
  heading.textContent = `Unit ${unit.id}: ${unit.title} failed to load`;

  const msg = document.createElement('p');
  msg.style.marginBottom = 'var(--step)';
  msg.textContent = error instanceof Error ? error.message : String(error);

  const meta = document.createElement('small');
  meta.style.color = 'var(--muted)';
  meta.textContent = `Lecture ${unit.lecture} · ${unit.slides} · Engine: ${unit.engine}`;

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
