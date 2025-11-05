/**
 * Convierte un Date o un string ISO a 'YYYY-MM-DD' para el backend.
 */
export function toApiDate(value: Date | string | null): string | null {
  if (!value) return null;

  // si ya viene '2025-11-20'
  if (typeof value === 'string' && value.length === 10) {
    return value;
  }

  // normalizamos a Date
  const d = typeof value === 'string' ? new Date(value) : value;

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Mostrar en UI.
 */
export function toDisplayDate(value: Date | string): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
