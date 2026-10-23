/**
 * Vista previa sin escritura, equivalente a la escala del backend.
 * La fuente oficial para días tomados/disponibles sigue siendo GET vacation-balance.
 * No utilizar este helper para aprobar vacaciones ni modificar saldos.
 */
export interface EmployeeVacationPreview {
  effective_entry_date: string;
  completed_years: number;
  annual_entitlement_days: number;
  next_anniversary_days: number;
  accrued_days: number;
  next_anniversary: string;
}

interface CivilDate { year: number; month: number; day: number; }

function parseCivilDate(value: string | null | undefined): CivilDate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day } : null;
}

function anniversary(start: CivilDate, years: number): string {
  const year = start.year + years;
  const lastDay = new Date(Date.UTC(year, start.month, 0)).getUTCDate();
  return `${String(year).padStart(4, '0')}-${String(start.month).padStart(2, '0')}-${String(Math.min(start.day, lastDay)).padStart(2, '0')}`;
}

function daysByAnniversary(years: number, anniversaryDate: string): number {
  if (years < 1) return 0;
  if (anniversaryDate >= '2023-01-01') {
    return years <= 5 ? 10 + 2 * years : 20 + 2 * Math.ceil((years - 5) / 5);
  }
  return years <= 4 ? 4 + 2 * years : 12 + 2 * Math.ceil((years - 4) / 5);
}

/** Fecha local de operación de MUDECPLAY, independiente del huso del navegador. */
export function todayInMazatlan(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (key: string): string => parts.find((part) => part.type === key)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function previewEmployeeVacation(
  entryDate: string | null | undefined,
  dischargeDate: string | null | undefined,
  reentryDate: string | null | undefined,
  asOf: string = todayInMazatlan(),
): EmployeeVacationPreview | null {
  const effective = reentryDate || entryDate;
  const start = parseCivilDate(effective);
  if (!start || !effective || !parseCivilDate(asOf)) return null;

  // Baja definitiva congela antigüedad; reingreso inicia nuevo periodo.
  const endDate = !reentryDate && dischargeDate && parseCivilDate(dischargeDate)
    ? (dischargeDate < asOf ? dischargeDate : asOf)
    : asOf;
  let years = Math.max(0, Number(endDate.slice(0, 4)) - start.year);
  if (anniversary(start, years) > endDate) years = Math.max(0, years - 1);
  if (endDate < effective) years = 0;

  let accrued = 0;
  for (let year = 1; year <= years; year++) {
    const date = anniversary(start, year);
    accrued += daysByAnniversary(year, date);
  }
  const lastAnniversary = years > 0 ? anniversary(start, years) : effective;
  const nextAnniversary = anniversary(start, years + 1);
  return {
    effective_entry_date: effective,
    completed_years: years,
    annual_entitlement_days: years ? daysByAnniversary(years, lastAnniversary) : 0,
    next_anniversary_days: daysByAnniversary(years + 1, nextAnniversary),
    accrued_days: accrued,
    next_anniversary: nextAnniversary,
  };
}
