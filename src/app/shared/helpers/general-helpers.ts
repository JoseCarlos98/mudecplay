/**
 * Convierte un Date o un string ISO a 'YYYY-MM-DD' para el backend.
 */
export function toApiDate(value: Date | string | null): string | null {
  if (!value) return null;

  // si ya viene '2025-11-20'
  if (typeof value === 'string' && value.length === 10) return value;

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


export function toCatalogLike(id?: number | null, name?: string | null): { id: number; name: string } | null {
  // si no hay id, no tiene sentido devolver catálogo
  if (id == null) return null;

  return {
    id,
    name: name ?? '',
  };
}

export function toIdForm(value: any): number | null {
  console.log(value);
  
  if (value == null) return null;
  // si ya es número
  if (typeof value === 'number') return value;
  // si viene como string de número
  if (typeof value === 'string') return Number(value);
  // si es el objeto { id, name }
  if (typeof value === 'object' && 'id' in value) return Number(value.id);
  return null;
}