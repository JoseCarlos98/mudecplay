import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  /** Tamaños predefinidos */
  private readonly sizes = {
    small: { width: '400px', maxWidth: '95vw' },
    medium: { width: '700px', maxWidth: '90vw' },
    large: { width: '80vw', maxWidth: '1200px' },
  };

  /**
   * Abre un componente modal genérico
   * @param component Componente a abrir
   * @param data Datos a inyectar
   * @param size Tamaño predefinido: small | medium | large
   * @param config Config adicional de MatDialog
   */
  open(
    component: any,
    data?: any,
    size: keyof typeof this.sizes = 'medium',
    config?: Partial<MatDialogConfig>
  ) {
    const finalConfig: MatDialogConfig = {
      ...this.sizes[size],
      minHeight: '40vh',
      disableClose: true,
      data,
      ...config,
    };

    return this.dialog.open(component, finalConfig);
  }
}
