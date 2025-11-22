export interface MenuItems {
  name: string;
  icon: string;
  route?: string;        // opcional si es solo sección
  children?: MenuItems[]; // sub-items (para Catálogos)
}

