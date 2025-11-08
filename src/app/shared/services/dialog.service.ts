import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConfirmModal } from '../ui/confirm-modal/confirm-modal';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  /** Tamaños predefinidos */
  private readonly sizes = {
    small: { width: '350px', maxWidth: '95vw' },
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

  /**
   * Abre un modal de confirmación y devuelve un observable<boolean>
   */
  confirm(options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    const dialogRef = this.dialog.open(ConfirmModal, {
      ...this.sizes.small,
      disableClose: true,

      data: {
        title: options.title ?? '',
        message: options.message ?? '¿Estás seguro?',
        confirmText: options.confirmText ?? 'Sí',
        cancelText: options.cancelText ?? 'Cancelar',
      },
    });

    return dialogRef.afterClosed();
  }
}
