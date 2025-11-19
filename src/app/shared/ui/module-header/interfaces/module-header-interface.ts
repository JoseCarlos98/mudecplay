export type ModuleHeaderAction =
  | 'new'
  | 'upload'
  | 'download'
  | 'close'
  | 'back'
  | 'custom';

// Botón adicional configurable
export interface ExtraButton {
  icon: string;
  label: string;
  action: string;
}

// Config general del header
export interface ModuleHeaderConfig {
  formFull?: boolean;
  modal?: boolean;
  showNew?: boolean;
  showUploadXml?: boolean;
  showDownload?: boolean;
}