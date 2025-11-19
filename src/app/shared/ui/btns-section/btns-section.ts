import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Acciones posibles que puede disparar el footer:
 * - cancel: cerrar / volver atrás
 * - save: guardar formulario
 * - search: disparar búsqueda de filtros
 * - clean: limpiar filtros
 */
export type ModuleFooterAction =
  | 'cancel'
  | 'save'
  | 'search'
  | 'clean';

@Component({
  selector: 'app-btns-section',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './btns-section.html',
  styleUrl: './btns-section.scss',
  // OnPush para que solo se vuelva a pintar cuando cambian @Input() o @Output()
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BtnsSection {
  /**
   * Modo del componente:
   * - true: se comporta como footer de formulario (Cancelar / Guardar)
   * - false: se comporta como footer de filtros (Buscar / Limpiar)
   */
  @Input() form: boolean = false;

  /**
   * Controla el estado del botón Guardar:
   * - true  => se muestra como "no clickeable" (ej: form.invalid)
   * - false => se puede usar normalmente
   */
  @Input() saveDisabled: boolean = false;

  /**
   * Indica si hay filtros activos.
   * - true  => se habilita el botón "Limpiar"
   * - false => se deshabilita para evitar limpiar cuando no hay nada aplicado
   */
  @Input() hasActiveFilters: boolean = false;

  /**
   * Evento único para todas las acciones del footer.
   * El padre hace un switch(action) y decide qué hacer.
   */
  @Output() action = new EventEmitter<ModuleFooterAction>();
}
