import { HttpParams } from "@angular/common/http";
import { Catalog } from "../interfaces/general-interfaces";

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
export function toCatalogAutoComplete(id?: number | null, name?: string | null ): Catalog | null {
  if (id == null) return null;

  return {
    id: id.toString(),
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
export function setScalar(
  params: HttpParams,
  key: string,
  value:
    | string
    | number
    | boolean
    | Date
    | null
    | undefined,
): HttpParams {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return params;
  }

  return params.set(key, String(value));
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
 * Convierte un string numérico a un importe redondeado.
 * Retorna null cuando el valor no es válido.
 */
export function normalizeMoney(
  value: string,
  decimals = 2,
): number | null {
  if (!value?.trim()) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return roundMoney(amount, decimals);
}

/**
 * Limpia texto al salir del input:
 * - Colapsa espacios múltiples a uno solo.
 * - Elimina espacios al inicio/fin.
 */
export function normalizeTextOnBlur(v: string): string {
  return v.replace(/\s+/g, ' ').trim();
}



/**
 * Redondea un importe monetario a la cantidad de decimales indicada.
 *
 * Evita residuos de punto flotante como:
 * 94.78999999999996 -> 94.79
 *
 * Por defecto utiliza 2 decimales.
 */
export function roundMoney(
  value: number,
  decimals = 2,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** decimals;

  return (
    Math.round(
      (value + Math.sign(value) * Number.EPSILON) *
        factor,
    ) / factor
  );
}



export interface TreasuryBankMovementDescriptionSource {
  description_original?:
    string | null;

  counterparty_name?:
    string | null;
}


export function getTreasuryMovementDescriptionDisplay(
  row:
    TreasuryBankMovementDescriptionSource,
): string {

  const description =
    row.description_original
      ?.trim() ||
    '';

  if (!description) {
    return 'Sin descripción';
  }


  // 1. BENEFICIARIO explícito
  const beneficiaryMatch =
    description.match(
      /BENEFICIARIO\s*:\s*([^|]+)/i,
    );

  if (
    beneficiaryMatch?.[1]?.trim()
  ) {

    return cleanMovementDisplayText(
      beneficiaryMatch[1],
    );
  }


  // 2. Contraparte detectada por parser
  if (
    row.counterparty_name
      ?.trim()
  ) {

    return cleanMovementDisplayText(
      row.counterparty_name,
    );
  }


  const parts =
    description
      .split('|')
      .map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean);


  // 3. Contraparte al final del texto bancario
  if (
    parts.length >= 4
  ) {

    const lastPart =
      parts[
        parts.length - 1
      ];

    if (
      looksLikeCounterpartyName(
        lastPart,
      )
    ) {

      return cleanMovementDisplayText(
        lastPart,
      );
    }
  }


  // 4. Concepto útil
  const concept =
    extractMovementConcept(
      description,
    );

  if (concept) {

    return limitMovementDisplayText(
      concept,
    );
  }


  // 5. Fallback limitado
  return limitMovementDisplayText(
    description,
  );
}


function extractMovementConcept(
  description:
    string,
): string {

  const parts =
    description
      .split('|')
      .map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean);

  for (
    const part of parts
  ) {

    const candidate =
      cleanMovementConceptPart(
        part,
      );

    if (
      isUsefulMovementConcept(
        candidate,
      )
    ) {

      return candidate;
    }
  }

  return '';
}


function cleanMovementConceptPart(
  value:
    string,
): string {

  let result =
    value.trim();


  // BanBajío
  result =
    result
      .replace(
        /^ENV[IÍ]O\s+SPEI\s*:\s*/i,
        '',
      )
      .replace(
        /^DEP[ÓO]SITO\s+SPEI\s*:\s*/i,
        '',
      );


  // BBVA
  result =
    result.replace(
      /^SPEI\s+(?:ENVIADO|RECIBIDO)\s+[A-ZÁÉÍÓÚÑ0-9.-]+(?:\/\d+)?\s*/i,
      '',
    );


  // Códigos iniciales
  result =
    result.replace(
      /^(?:\d{3}\s+)?\d{6,8}(?=[A-ZÁÉÍÓÚÑ])/i,
      '',
    );


  // Referencias técnicas
  result =
    result.replace(
      /\s+REF\.?\s*.*$/i,
      '',
    );


  return result.trim();
}


function isUsefulMovementConcept(
  value:
    string,
): boolean {

  const text =
    value.trim();

  if (!text) {
    return false;
  }

  const compact =
    text.replace(
      /\s+/g,
      '',
    );


  if (
    /^\d+$/.test(
      compact,
    )
  ) {
    return false;
  }


  if (
    /^(?:BB|BNET)[A-Z0-9]+$/i.test(
      compact,
    )
  ) {
    return false;
  }


  if (
    /^(?:INSTITUCI[ÓO]N|CUENTA|REFERENCIA|CLAVE DE RASTREO|HORA)\b/i.test(
      text,
    )
  ) {
    return false;
  }


  return /[A-ZÁÉÍÓÚÑ]/i.test(
    text,
  );
}


function looksLikeCounterpartyName(
  value:
    string,
): boolean {

  const text =
    value.trim();

  if (!text) {
    return false;
  }


  const compact =
    text.replace(
      /\s+/g,
      '',
    );


  if (
    /^\d+$/.test(
      compact,
    )
  ) {
    return false;
  }


  if (
    /^(?:BB|BNET)[A-Z0-9]+$/i.test(
      compact,
    )
  ) {
    return false;
  }


  if (
    /^(?:INSTITUCI[ÓO]N|CUENTA|REFERENCIA|CLAVE DE RASTREO|HORA)\b/i.test(
      text,
    )
  ) {
    return false;
  }


  return (
    text
      .split(/\s+/)
      .length >= 2 &&
    /[A-ZÁÉÍÓÚÑ]{2,}/i.test(
      text,
    )
  );
}


function cleanMovementDisplayText(
  value:
    string,
): string {

  return value
    .replace(
      /\s*\(B(?:I)?(?:-[^)]*)?\)?\s*$/i,
      '',
    )
    .trim();
}


function limitMovementDisplayText(
  value:
    string,

  maxLength =
    90,
): string {

  const text =
    value.trim();

  if (
    text.length <=
    maxLength
  ) {
    return text;
  }


  return `${text
    .slice(
      0,
      maxLength - 1,
    )
    .trim()}…`;
}