export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export type RoleCode =
  | 'ADMIN_GENERAL'
  | 'GASTOS_EDITOR'
  | 'GASTOS_XML_IMPORTADOR'
  | 'REPORTES_EMISOR'
  | 'PROVEEDORES_EDITOR'
  | 'PROYECTOS_EDITOR'
  | 'CLIENTES_EDITOR'
  | 'RESPONSABLES_EDITOR'
  | 'PRODUCTOS_EDITOR'
  | 'USUARIOS_EDITOR'
  | 'CUENTAS_POR_COBRAR_EDITOR'
  | 'CUENTAS_POR_COBRAR_XML_IMPORTADOR'
  | 'AREAS_EDITOR'
  | 'AREAS_EMPLEADOS_EDITOR'
  | 'ASISTENCIA_EDITOR'
  | 'EMPLEADOS_EDITOR'
  | 'LLEGADAS_RETARDOS_EDITOR'
  | 'HORAS_EXTRAS_EDITOR'
  | 'PRESTAMOS_EDITOR'
  | 'NOMINA_EDITOR'
  | 'ALMACEN_EDITOR'
  | 'ORDENES_COMPRA_EDITOR'
  | 'ORDENES_COMPRA_TICKETS_SUBIDOR'
  | 'ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'
  | 'ACCESO_HORARIO_LABORAL'
  | (string & {});

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  lastName: string;
  roles: RoleCode[];
  isActive?: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
