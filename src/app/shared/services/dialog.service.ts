import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConfirmModal } from '../ui/confirm-modal/confirm-modal';

/** Mapa de tamaños global (fuera de la clase para usarlo en tipos) */
export const DIALOG_SIZES = {
  mini:   { width: '350px', maxWidth: '95vw' },
  small:  { width: '650px', maxWidth: '95vw' },
  medium: { width: '870px', maxWidth: '90vw' },
  large:  { width: '80vw',  maxWidth: '1200px' },
} as const;

export type DialogSize = keyof typeof DIALOG_SIZES; // 'mini' | 'small' | 'medium' | 'large'

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  /**
   * Abre un componente modal genérico
   * @param size mini | small | medium | large (por defecto 'medium')
   */
  open(
    component: any,
    data?: any,
    size: DialogSize = 'medium',
    config?: Partial<MatDialogConfig>
  ) {
    const sizeKey: DialogSize = size ?? 'medium';

    const finalConfig: MatDialogConfig = {
      ...DIALOG_SIZES[sizeKey],
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      data,
      ...config,
    };

    return this.dialog.open(component, finalConfig);
  }

  /**
   * Modal de confirmación reutilizable
   * Puedes pasar size: 'mini' | 'small' | 'medium' | 'large'
   */
  confirm(options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    size?: DialogSize;
  }) {
    const sizeKey: DialogSize = options.size ?? 'small';

    const dialogRef = this.dialog.open(ConfirmModal, {
      ...DIALOG_SIZES[sizeKey],
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

  /**
   * Alias rápido si quieres forzar siempre mini en ciertos casos.
   * Se puede usar o no, según te guste.
   */
  confirmMini(options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    return this.confirm({ ...options, size: 'mini' });
  }
}
