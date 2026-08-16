import { RoleCode } from "../../../../auth/interfaces/auth.interface";

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

  /**
   * Roles requeridos para ver el botón.
   * Si se omite, se muestra siempre (asumiendo que config lo permite).
   */
  roles?: RoleCode[];
}

export interface ModuleHeaderConfig {
  modal?: boolean;
  formFull?: boolean;

  showNew?: boolean;
  showUploadXml?: boolean;
  showDownload?: boolean;

  /**
   * Roles requeridos por botón (si se omite, no se valida rol para ese botón).
   * ADMIN_GENERAL pasa siempre por bypass en PermissionsService.
   */
  newRoles?: RoleCode[];
  uploadXmlRoles?: RoleCode[];
  downloadRoles?: RoleCode[];
}
