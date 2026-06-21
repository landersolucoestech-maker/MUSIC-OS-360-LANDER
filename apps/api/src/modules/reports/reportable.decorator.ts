/**
 * modules/reports/reportable.decorator.ts
 *
 * FASE 1 — mecanismo explícito de reportabilidade por entidade.
 *
 * Permite marcar uma entidade TypeORM como reportável (ou não) diretamente na
 * classe, SOBREPONDO a classificação central. Uso opcional — a classificação
 * central já cobre o inventário; o decorator existe para futuras entidades e
 * para ajustes pontuais auditáveis.
 *
 *   @Reportable({ category: EntityCategory.REPORTABLE, label: 'Artistas' })
 *   @Entity('artists')
 *   export class ArtistEntity { … }
 */
import 'reflect-metadata';
import { EntityCategory } from './entity-metadata.types';

export interface ReportableOptions {
  /** Categoria explícita (sobrepõe a central). */
  category?: EntityCategory;
  /** Atalho: `reportable: false` ⇒ NOT_REPORTABLE. */
  reportable?: boolean;
  /** Rótulo operacional pt-BR. */
  label?: string;
}

export const REPORTABLE_METADATA = Symbol('music-os-360:reportable');

export function Reportable(options: ReportableOptions = {}): ClassDecorator {
  return (target) => {
    const resolved: ReportableOptions = { ...options };
    if (resolved.category === undefined && resolved.reportable === false) {
      resolved.category = EntityCategory.NOT_REPORTABLE;
    }
    Reflect.defineMetadata(REPORTABLE_METADATA, resolved, target);
  };
}

/** Lê a marcação `@Reportable` de uma classe de entidade, se houver. */
export function getReportableMetadata(target: unknown): ReportableOptions | undefined {
  if (typeof target !== 'function') return undefined;
  return Reflect.getMetadata(REPORTABLE_METADATA, target) as ReportableOptions | undefined;
}
