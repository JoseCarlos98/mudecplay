import { CommonModule } from '@angular/common';
import {
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './autocomplete-multiple.html',
  styleUrls: ['./autocomplete-multiple.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMultiSelect implements ControlValueAccessor {
  // ====== API del componente (Inputs personalizables) ======
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Todos';
  @Input() searchPlaceholder = 'Buscar';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' | 'client' | 'responsible' = 'supplier';
  @Input() data: Catalog[] = [];
  @Input() errorMessage = 'Este campo es obligatorio';

  /**
   * ✅ NUEVO: parámetros extra para el backend (opcional)
   * Ej: { statusProject: 'open' } para /projects/catalog
   *
   * - No rompe nada: si no lo mandas, se ignora.
   * - Se envía solo en modo remote.
   */
  @Input() extraParams?: Record<string, any>;

  /**
   * Cómo viaja el valor hacia el formulario:
   * - 'ids' (default): number[] | string[]
   * - 'objects': Catalog[]
   */
  @Input() valueMode: 'ids' | 'objects' = 'ids';

  // ====== Estado interno ======
  disabled = false;
  filteredOptions: Catalog[] = [];
  selectedIds: Array<number | string> = [];

  private optionsPool: Catalog[] = [];
  private search$ = new Subject<string>();

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly catalogsService = inject(CatalogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const text = (term ?? '').trim();

          // ----- MODO LOCAL -----
          if (!this.remote) {
            this.filteredOptions = this.pinSelected(this.filterLocal(text));
            this.cdr.markForCheck();
            return of(null);
          }

          // ----- MODO REMOTO: primero cache -----
          const local = this.filterFromPool(text);
          if (local.length) {
            this.filteredOptions = this.pinSelected(local);
            this.cdr.markForCheck();
            return of(null);
          }

          // Si no hay en cache → pegarle al backend
          return this.fetchRemote(text).pipe(
            tap((results) => {
              this.addToPool(results);
              this.filteredOptions = this.pinSelected(this.filterFromPool(text));
              this.cdr.markForCheck();
            }),
          );
        }),
      )
      .subscribe();
  }

  // =====================================================
  //  ControlValueAccessor
  // =====================================================

  writeValue(value: any): void {
    if (!value) {
      this.selectedIds = [];
      this.cdr.markForCheck();
      return;
    }

    // MODO por IDS
    if (this.valueMode === 'ids') {
      this.selectedIds = Array.isArray(value) ? value : [];
      this.cdr.markForCheck();
      return;
    }

    // MODO por OBJETOS (Catalog[])
    const arr = Array.isArray(value) ? (value as Catalog[]) : [];
    this.addToPool(arr);
    this.selectedIds = arr.map((v) => v.id);

    this.filteredOptions = this.pinSelected(this.allOptions);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ==========================
  //  Eventos de UI
  // ==========================

  onOpenedChange(opened: boolean) {
    if (!opened) return;

    if (!this.remote) {
      this.filteredOptions = this.pinSelected(this.data);
    } else {
      // últimos 10 vistos + seleccionados arriba
      this.filteredOptions = this.pinSelected(this.optionsPool.slice(-10).reverse());
    }

    this.cdr.markForCheck();
  }

  onSearch(term: string) {
    this.search$.next(term);
  }

  onSelectionChange(e: MatSelectChange) {
    const value = Array.isArray(e.value) ? e.value : [];
    this.selectedIds = value;

    let emitted: any;

    // MODO IDS → se emite el array de ids
    if (this.valueMode === 'ids') {
      emitted = value;
    } else {
      // MODO OBJETOS → construimos Catalog[] en base al pool
      const map = new Map<string, Catalog>();
      for (const opt of this.allOptions) {
        map.set(String(opt.id), opt);
      }

      emitted = value
        .map((id: any) => map.get(String(id)))
        .filter((x): x is Catalog => !!x);
    }

    this.onChange(emitted);
    this.onTouched();
    this.cdr.markForCheck();
  }

  // ==========================
  //  Errores
  // ==========================
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

  // ==========================
  //  Helpers
  // ==========================

  private get allOptions(): Catalog[] {
    const uniq = new Map<string | number, Catalog>();
    for (const o of [...this.data, ...this.optionsPool]) {
      if (!uniq.has(o.id)) uniq.set(o.id, o);
    }
    return Array.from(uniq.values());
  }

  private filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((i) => i.name.toLowerCase().includes(lower));
  }

  /**
   * ✅ IMPORTANTE:
   * fetchRemote ahora pasa extraParams al CatalogsService cuando aplique.
   * Esto NO rompe nada porque extraParams es opcional.
   */
  private fetchRemote(search: string) {
    const extra = this.sanitizeExtraParams(this.extraParams);

    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.suppliersCatalog(search); // sin extras por ahora
      case 'project':
        return this.catalogsService.projectsCatalog(search, extra); //  con extras
      case 'client':
        return this.catalogsService.clientsCatalog(search); // sin extras por ahora
      case 'responsible':
        return this.catalogsService.responsibleCatalog(search); // sin extras por ahora
      default:
        return of([] as Catalog[]);
    }
  }

  clearAll(evt?: Event) {
    evt?.preventDefault();
    evt?.stopPropagation();

    this.selectedIds = [];

    const emptyValue = this.valueMode === 'ids' ? [] : ([] as Catalog[]);
    this.onChange(emptyValue);
    this.onTouched();

    this.filteredOptions = this.remote
      ? this.optionsPool.slice(-10).reverse()
      : this.data;

    this.cdr.markForCheck();
  }

  private addToPool(results: Catalog[]) {
    for (const item of results) {
      if (!this.optionsPool.some((o) => String(o.id) === String(item.id))) {
        this.optionsPool.push(item);
      }
    }
  }

  private filterFromPool(term: string): Catalog[] {
    const lower = term.toLowerCase();
    return this.optionsPool.filter((o) => o.name.toLowerCase().includes(lower));
  }

  private pinSelected(list: Catalog[]): Catalog[] {
    const selectedSet = new Set(this.selectedIds.map(String));
    const selectedObjs = this.allOptions.filter((o) => selectedSet.has(String(o.id)));
    const rest = list.filter((o) => !selectedSet.has(String(o.id)));
    return [...selectedObjs, ...rest];
  }

  compareById = (a: any, b: any) => String(a) === String(b);

  /**
   * ✅ Limpia extraParams para no mandar basura al backend
   * - elimina null/undefined/''
   * - deja solo keys con valor útil
   */
  private sanitizeExtraParams(params?: Record<string, any>): Record<string, any> | undefined {
    if (!params) return undefined;

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      out[k] = v;
    }

    return Object.keys(out).length ? out : undefined;
  }
}