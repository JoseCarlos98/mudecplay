import { HttpParams } from "@angular/common/http";

/**
 * Convierte un Date o un string ISO a 'YYYY-MM-DD' para el backend.
 * - Si value ya viene como '2025-11-20' (10 chars), lo respeta.
 * - Si es Date o string parseable, arma YYYY-MM-DD usando TZ local.
 * - Si no hay valor, retorna null (para no enviar el parámetro).
 *
 * Nota: new Date('YYYY-MM-DD') puede interpretarse como UTC en JS,
 * lo que podría desplazar el día según tu zona horaria. Si esto es
 * crítico, conviene manejar fechas "planas" (sin TZ) o usar una lib.
 */
export function toApiDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  // Si ya viene '2025-11-20'
  if (typeof value === 'string' && value.length === 10) return value;

  // Parseo básico: ojo con TZ si el string no es puro 'YYYY-MM-DD'
  const d = typeof value === 'string' ? new Date(value) : value;

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formato de fecha para UI: 'DD/MM/YYYY'.
 * - Acepta Date o string parseable por Date.
 * - Si no hay valor, devuelve '' (string vacío).
 *
 * Igual que arriba, si pasas strings con TZ puede variar el día.
 */
export function toDisplayDate(value: Date | string): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Normaliza a shape de catálogo { id, name }.
 * - Si no hay id, retorna null (no tiene sentido sin identificador).
 * - name se rellena con '' si no llega.
 */
export function toCatalogLike(id?: number | null, name?: string | null): { id: number; name: string } | null {
  if (id == null) return null;

  return {
    id,
    name: name ?? '',
  };
}

/**
 * Extrae el id como number desde distintos tipos:
 * - number   -> retorna tal cual
 * - string   -> Number(string)
 * - objeto   -> Number(value.id) si existe
 * Si falla o no hay id, retorna null.
 */
export function toIdForm(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && 'id' in value) return Number(value.id);
  return null;
}

/**
 * Agrega un parámetro escalar a HttpParams solo si hay valor.
 * - Ignora null/undefined/'' para no ensuciar la URL.
 * - IMPORTANTE: HttpParams es inmutable; siempre reasigna el retorno.
 */
export function setScalar<T extends string | number | null | undefined | Date >(
  p: HttpParams,
  key: string,
  value: T
): HttpParams {
  if (value === null || value === undefined || value === '' as any) return p;
  return p.set(key, String(value));
}

/**
 * Agrega varios valores repetidos a HttpParams, p.ej:
 *   appendArray(p, 'ids', [1,2]) => ?ids=1&ids=2
 * - Si values está vacío/undefined/null, no hace nada.
 * - IMPORTANTE: reasignar 'p' porque HttpParams es inmutable.
 */
export function appendArray(
  p: HttpParams,
  key: string,
  values?: ReadonlyArray<string | number> | null
): HttpParams {
  if (!values || values.length === 0) return p;
  for (const v of values) p = p.append(key, String(v));
  return p;
}

/**
 * Convierte string numérico a number o retorna null si no es válido.
 * - No limpia separadores, asume que 'v' ya está saneado (solo dígitos y punto).
 */
export function normalizeMoney(v: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Limpia texto al salir del input:
 * - Colapsa espacios múltiples a uno solo.
 * - Elimina espacios al inicio/fin.
 */
export function normalizeTextOnBlur(v: string): string {
  return v.replace(/\s+/g, ' ').trim();
}
