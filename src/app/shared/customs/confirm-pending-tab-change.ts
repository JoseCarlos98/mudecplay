import { Observable, of } from 'rxjs';
import { DialogService } from '../services/dialog.service';

export interface ConfirmPendingTabChangeOptions {
  /** Revisa si hay cambios pendientes */
  hasPending?: () => boolean;

  /** Aplica el cambio (setActive, navigate, etc.) */
  apply: () => void;

  /** DialogService para mostrar confirm */
  dialog: DialogService;

  /** Personaliza el texto */
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Helper reutilizable:
 * - si NO hay cambios → aplica y listo
 * - si hay cambios → confirm → si ok aplica
 */
export function confirmPendingTabChange(opts: ConfirmPendingTabChangeOptions): Observable<boolean> {
  const has = opts.hasPending?.() ?? false;

  if (!has) {
    opts.apply();
    return of(true);
  }

  return new Observable<boolean>((sub) => {
    opts.dialog.confirm({
      message: opts.message ?? 'Tienes cambios sin guardar. ¿Cambiar de sección de todos modos?',
      confirmText: opts.confirmText ?? 'Cambiar sin guardar',
      cancelText: opts.cancelText ?? 'Cancelar',
    }).subscribe((ok) => {
      if (ok) opts.apply();
      sub.next(!!ok);
      sub.complete();
    });
  });
}
