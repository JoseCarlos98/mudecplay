import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Acciones posibles que puede disparar el footer:
 * - cancel: cerrar / volver atrás
 * - save: guardar formulario
 * - search: disparar búsqueda de filtros
 * - clean: limpiar filtros
 * - continue: continuar flujo
 */
export type ModuleFooterAction =
  | 'cancel'
  | 'save'
  | 'search'
  | 'clean'
  | 'continue';

export type ModuleFooterButtonVariant = 'primary' | 'danger';

@Component({
  selector: 'app-btns-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './btns-section.html',
  styleUrl: './btns-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BtnsSection implements OnDestroy {
  /**
   * Modo del componente:
   * - save: footer de formulario Cancelar / Guardar
   * - search: acciones de filtros Buscar / Limpiar
   * - continue: footer Cancelar / Continuar
   */
  @Input() type: ModuleFooterAction = 'save';

  /**
   * Id del formulario al que se conecta el botón submit.
   * Por defecto se mantiene como "form" para no romper modales existentes.
   */
  @Input() form: string = 'form';

  /**
   * Textos configurables.
   * Por defecto mantiene el comportamiento actual.
   */
  @Input() cancelLabel: string = 'Cancelar';
  @Input() saveLabel: string = 'Guardar';
  @Input() continueLabel: string = 'Continuar';

  /**
   * Íconos opcionales para botones principales.
   */
  @Input() saveIcon: string | null = null;
  @Input() continueIcon: string | null = null;

  /**
   * Variantes visuales.
   * primary = azul normal.
   * danger = rojo para acciones delicadas.
   */
  @Input() saveVariant: ModuleFooterButtonVariant = 'primary';
  @Input() continueVariant: ModuleFooterButtonVariant = 'primary';

  /**
   * Estados disabled.
   */
  @Input() saveDisabled: boolean = false;
  @Input() cancelDisabled: boolean = false;
  @Input() continueDisabled: boolean = false;

  /**
   * Bloqueo interno contra doble click.
   * Sirve para evitar doble submit inmediato sin obligar a cada pantalla a manejar saving.
   */
  @Input() preventDoubleClick: boolean = true;
  @Input() doubleClickLockMs: number = 1200;

  /**
   * Configuración de filtros.
   */
  @Input() searchDisabled: boolean = true;
  @Input() hasActiveFilters: boolean = false;
  @Input() hasActiveSearch: boolean = false;

  /**
   * Evento único para todas las acciones del footer.
   * El padre hace un switch(action) y decide qué hacer.
   */
  @Output() action = new EventEmitter<ModuleFooterAction>();

  readonly actionLocked = signal(false);

  private unlockTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.clearUnlockTimeout();
  }

  emitAction(action: ModuleFooterAction): void {
    if (this.isActionDisabled(action)) return;

    if (this.shouldLockAction(action)) {
      if (this.actionLocked()) return;

      this.actionLocked.set(true);
      this.clearUnlockTimeout();

      this.unlockTimeout = setTimeout(() => {
        this.actionLocked.set(false);
        this.unlockTimeout = null;
      }, this.doubleClickLockMs);
    }

    this.action.emit(action);
  }

  isActionDisabled(action: ModuleFooterAction): boolean {
    switch (action) {
      case 'cancel':
        return this.cancelDisabled;

      case 'save':
        return this.saveDisabled || this.actionLocked();

      case 'continue':
        return this.continueDisabled || this.actionLocked();

      case 'search':
        return this.isSearchButtonDisabled() || this.actionLocked();

      case 'clean':
        return !this.hasActiveFilters;

      default:
        return false;
    }
  }

  private shouldLockAction(action: ModuleFooterAction): boolean {
    return (
      this.preventDoubleClick &&
      ['save', 'continue', 'search'].includes(action)
    );
  }

  private isSearchButtonDisabled(): boolean {
    return this.hasActiveSearch ? !this.hasActiveSearch : false;
  }

  private clearUnlockTimeout(): void {
    if (!this.unlockTimeout) return;

    clearTimeout(this.unlockTimeout);
    this.unlockTimeout = null;
  }
}