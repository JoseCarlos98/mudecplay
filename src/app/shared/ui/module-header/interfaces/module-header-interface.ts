import { RoleCode } from '../../../../auth/interfaces/auth.interface';

export type ModuleHeaderAction =
  | 'new'
  | 'upload'
  | 'download'
  | 'back'
  | 'close';

export interface ExtraButton {
  label: string;
  icon: string;
  action: string;
  roles?: RoleCode[];
  /** Compatibilidad con botones extras previamente configurados. */
  variant?: 'blue' | 'default';
}

/** Acción de carga personalizada con el mismo estilo que Cargar XML. */
export interface ModuleHeaderUploadButton {
  label: string;
  action: string;
  icon?: string;
  roles?: RoleCode[];
}

export interface ModuleHeaderConfig {
  modal?: boolean;
  formFull?: boolean;

  showNew?: boolean;
  showUploadXml?: boolean;
  showDownload?: boolean;

  newRoles?: RoleCode[];
  uploadXmlRoles?: RoleCode[];
  downloadRoles?: RoleCode[];

  /** Botón de carga genérico, sin alterar showUploadXml. */
  uploadButton?: ModuleHeaderUploadButton;
}
