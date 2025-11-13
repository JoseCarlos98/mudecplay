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

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatOptionModule, MatInputModule],
  templateUrl: './autocomplete-multiple.html',
  styleUrls: ['./autocomplete-multiple.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMultiSelect implements ControlValueAccessor {
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Todos';
  @Input() searchPlaceholder = 'Buscar…';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];
  @Input() errorMessage = 'Este campo es obligatorio';

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

    // Búsqueda local/remota con cache + OnPush
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          const text = (term ?? '').trim();

          if (!this.remote) {
            this.filteredOptions = this.pinSelected(this.filterLocal(text));
            this.cdr.markForCheck();
            return of(null);
          }

          const local = this.filterFromPool(text);
          if (local.length) {
            this.filteredOptions = this.pinSelected(local);
            this.cdr.markForCheck();
            return of(null);
          }

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

  // ControlValueAccessor
  writeValue(value: any): void {
    if (!value) this.selectedIds = [];
    else if (Array.isArray(value)) this.selectedIds = value;
    this.cdr.markForCheck();
  }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; this.cdr.markForCheck(); }

  // Eventos UI
  onOpenedChange(opened: boolean) {
    if (!opened) return;
    if (!this.remote) {
      this.filteredOptions = this.pinSelected(this.data);
    } else {
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
    this.onChange(this.selectedIds);
    this.onTouched();
    this.cdr.markForCheck();
  }

  // Errores
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

  // ===== Helpers =====
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
    return this.data.filter(i => i.name.toLowerCase().includes(lower));
  }

  private fetchRemote(search: string) {
    switch (this.catalogType) {
      case 'supplier': return this.catalogsService.supplierCatalog(search);
      case 'project':  return this.catalogsService.projectsCatalog(search);
      default:         return of([] as Catalog[]);
    }
  }

  private addToPool(results: Catalog[]) {
    for (const item of results) {
      if (!this.optionsPool.some(o => String(o.id) === String(item.id))) {
        this.optionsPool.push(item);
      }
    }
  }

  private filterFromPool(term: string): Catalog[] {
    const lower = term.toLowerCase();
    return this.optionsPool.filter(o => o.name.toLowerCase().includes(lower));
  }

  // Mantén seleccionados en la lista filtrada
  private pinSelected(list: Catalog[]): Catalog[] {
    const selectedSet = new Set(this.selectedIds.map(String));
    const selectedObjs = this.allOptions.filter(o => selectedSet.has(String(o.id)));
    const rest = list.filter(o => !selectedSet.has(String(o.id)));
    return [...selectedObjs, ...rest];
  }

  // Evita mismatches number|string
  compareById = (a: any, b: any) => String(a) === String(b);
}
