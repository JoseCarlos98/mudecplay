import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
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
export class BtnsSection {
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
}