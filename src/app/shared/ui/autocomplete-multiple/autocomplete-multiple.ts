import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  Optional,
  Self,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { Subject, of, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  // Módulos mínimos para funcionar dentro de cualquier feature module
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatOptionModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './autocomplete-multiple.html',
  styleUrls: ['./autocomplete-multiple.scss'],
  // OnPush para rendimiento: solo re-renderiza con cambios de @Input, eventos o markForCheck()
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMultiSelect implements ControlValueAccessor {
  // ====== API del componente (Inputs personalizables) ======
  @Input() label = 'Seleccionar';              // Título/etiqueta visible arriba del campo
  @Input() placeholder = 'Todos';              // Texto cuando no hay selección
  @Input() searchPlaceholder = 'Buscar';      // Placeholder del input de búsqueda interno
  @Input() remote = false;                     // true: busca en backend; false: filtra local
  @Input() catalogType: 'supplier' | 'project' | 'client' | 'responsible' = 'supplier'; // Qué catálogo consultar cuando es remoto
  @Input() data: Catalog[] = [];               // Fuente local (modo local)
  @Input() errorMessage = 'Este campo es obligatorio'; // Mensaje por defecto si hay error

  // ====== Estado interno ======
  disabled = false;                // Deshabilitar el control desde el exterior
  filteredOptions: Catalog[] = []; // Lista que se muestra en el panel en cada búsqueda
  selectedIds: Array<number | string> = []; // Valor que viaja al form (ids seleccionados)

  // Pool de resultados ya vistos (cache en memoria) para reducir peticiones remotas
  private optionsPool: Catalog[] = [];

  // Stream de texto que escribe el usuario en el buscador del panel
  private search$ = new Subject<string>();

  // Callbacks de ControlValueAccessor (Angular Forms)
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  // ====== Inyecciones ======
  private readonly catalogsService = inject(CatalogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Optional() @Self() private ngControl: NgControl) {
    // Si el componente está dentro de un form control, nos registramos como valueAccessor
    if (this.ngControl) this.ngControl.valueAccessor = this;

    // ====== Armado del flujo de búsqueda (local/remoto) ======
    // - debounce: evita spamear la búsqueda
    // - distinctUntilChanged: ignora texto repetido
    // - switchMap: cancela búsquedas anteriores si llega una nueva
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          const text = (term ?? '').trim();

          // ---- MODO LOCAL: se filtra sobre `data` ----
          if (!this.remote) {
            // pinSelected: asegura que opciones ya seleccionadas sigan visibles arriba
            this.filteredOptions = this.pinSelected(this.filterLocal(text));
            this.cdr.markForCheck(); // OnPush: marca cambios manualmente
            return of(null);
          }

          // ---- MODO REMOTO: primero intento con lo que ya tengo en cache (optionsPool) ----
          const local = this.filterFromPool(text);
          if (local.length) {
            this.filteredOptions = this.pinSelected(local);
            this.cdr.markForCheck();
            return of(null);
          }

          // Si no hay matches en cache → pido al backend, guardo en pool y vuelvo a filtrar
          return this.fetchRemote(text).pipe(
            tap(results => {
              this.addToPool(results);
              this.filteredOptions = this.pinSelected(this.filterFromPool(text));
              this.cdr.markForCheck();
            })
          );
        })
      )
      .subscribe();
  }

  // ====== ControlValueAccessor (para integrarse con Reactive Forms) ======

  // Angular escribe el valor externo hacia el componente
  writeValue(value: any): void {
    if (!value) this.selectedIds = [];
    else if (Array.isArray(value)) this.selectedIds = value;
    this.cdr.markForCheck(); // OnPush
  }

  // Angular registra el callback para propagar cambios al form
  registerOnChange(fn: any) { this.onChange = fn; }

  // Angular registra el callback para el “touched”
  registerOnTouched(fn: any) { this.onTouched = fn; }

  // Angular habilita/deshabilita el control
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; this.cdr.markForCheck(); }

  // ====== Eventos de UI ======

  /**
   * Se dispara al abrir/cerrar el panel del select.
   * Al abrir:
   *  - Local: muestra todo el `data`.
   *  - Remoto: muestra los últimos 10 vistos (MRU) del pool.
   */
  onOpenedChange(opened: boolean) {
    if (!opened) return;
    if (!this.remote) {
      this.filteredOptions = this.pinSelected(this.data);
    } else {
      this.filteredOptions = this.pinSelected(this.optionsPool.slice(-10).reverse());
    }
    this.cdr.markForCheck();
  }

  /**
   * Cada vez que el usuario escribe en el buscador interno del panel.
   * Empuja el término al stream para disparar la tubería de búsqueda.
   */
  onSearch(term: string) {
    this.search$.next(term);
  }

  /**
   * Cuando cambia la selección del mat-select (agregar/quitar chips).
   * Propaga el array de ids seleccionados hacia el form padre.
   */
  onSelectionChange(e: MatSelectChange) {
    const value = Array.isArray(e.value) ? e.value : [];
    this.selectedIds = value;
    this.onChange(this.selectedIds); // notifica al form
    this.onTouched();                // marca touched
    this.cdr.markForCheck();         // OnPush
  }

  // ====== Estado de errores para mostrar mensajes bajo el campo ======
  get hasError(): boolean {
    const ctrl = this.ngControl?.control;
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }
  get firstErrorMessage(): string {
    const errors = this.ngControl?.control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio';
    return this.errorMessage;
  }

  // ====== Helpers de datos/filtrado/cache ======

  /**
   * Mezcla `data` + `optionsPool` y elimina duplicados por id.
   * Útil para resolver etiquetas (labels) y fijar seleccionados.
   */
  private get allOptions(): Catalog[] {
    const uniq = new Map<string | number, Catalog>();
    for (const o of [...this.data, ...this.optionsPool]) {
      if (!uniq.has(o.id)) uniq.set(o.id, o);
    }
    return Array.from(uniq.values());
  }

  /**
   * Filtra en modo local contra `data`.
   */
  private filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter(i => i.name.toLowerCase().includes(lower));
  }

  /**
   * Pide al backend según el `catalogType`.
   * Devuelve observable con resultados para agregarlos a la cache (pool).
   */
  private fetchRemote(search: string) {
    switch (this.catalogType) {
      case 'supplier': return this.catalogsService.supplierCatalog(search);
      case 'project': return this.catalogsService.projectsCatalog(search);
      case 'client': return this.catalogsService.clientsCatalog(search);
      case 'responsible': return this.catalogsService.responsibleCatalog(search);
      default: return of([] as Catalog[]);
    }
  }

  clearAll(evt?: Event) {
    evt?.preventDefault();
    evt?.stopPropagation();

    this.selectedIds = [];
    this.onChange(this.selectedIds);
    this.onTouched();

    // Reponer la lista visible a un estado “inicial”
    this.filteredOptions = this.remote
      ? this.optionsPool.slice(-10).reverse()
      : this.data;

    this.cdr.markForCheck();
  }


  /**
   * Agrega resultados al pool si no existen (evita duplicados por id).
   * Sirve como cache simple en memoria por sesión de componente.
   */
  private addToPool(results: Catalog[]) {
    for (const item of results) {
      if (!this.optionsPool.some(o => String(o.id) === String(item.id))) {
        this.optionsPool.push(item);
      }
    }
  }

  /**
   * Filtra contra el pool (cache) en modo remoto antes de pegarle al backend.
   */
  private filterFromPool(term: string): Catalog[] {
    const lower = term.toLowerCase();
    return this.optionsPool.filter(o =>
      o.name.toLowerCase().includes(lower)
    );
  }

  /**
   * Asegura que las opciones seleccionadas siempre aparezcan arriba de la lista filtrada,
   * para que el usuario no “pierda de vista” lo que ya eligió al seguir escribiendo.
   */
  private pinSelected(list: Catalog[]): Catalog[] {
    const selectedSet = new Set(this.selectedIds.map(String));
    const selectedObjs = this.allOptions.filter(o => selectedSet.has(String(o.id)));
    const rest = list.filter(o => !selectedSet.has(String(o.id)));
    return [...selectedObjs, ...rest];
  }

  /**
   * Comparador por id (normaliza a string para evitar mismatch number|string).
   * — Útil si decides usar [compareWith] en <mat-select>.
   */
  compareById = (a: any, b: any) => String(a) === String(b);
}
