import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Optional,
  Self,
  inject,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap, tap } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatSelect,
    MatSelectTrigger
  ],
  templateUrl: './autocomplete-multiple.html',
  styleUrls: ['./autocomplete-multiple.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMultiSelect implements ControlValueAccessor {
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Selecciona...';
  @Input() searchPlaceholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];
  @Input() errorMessage = 'Este campo es obligatorio';

  disabled = false;

  // opciones mostradas en el panel
  filteredOptions: Catalog[] = [];

  // ids seleccionados
  private selectedIds: Array<number | string> = [];

  // para mostrar en el trigger
  get selectedLabels(): string[] {
    return this.selectedIds
      .map((id) => this.allOptions.find((o) => o.id === id))
      .filter((x): x is Catalog => !!x)
      .map((o) => o.name);
  }

  // pool para ir guardando lo que venga del backend
  private optionsPool: Catalog[] = [];

  // stream de búsqueda
  private search$ = new Subject<string>();

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly catalogsService = inject(CatalogsService);

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // armar búsqueda
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const text = term.trim();

          // si es local
          if (!this.remote) {
            this.filteredOptions = this.filterLocal(text);
            return of(null);
          }

          // remoto: primero intento con pool
          const matches = this.filterFromPool(text);
          if (matches.length) {
            this.filteredOptions = matches;
            return of(null);
          }

          // si no hay en pool, le pego al backend
          return this.fetchRemote(text).pipe(
            tap((results) => {
              this.addToPool(results);
              this.filteredOptions = this.filterFromPool(text);
            })
          );
        })
      )
      .subscribe();
  }

  // todas las opciones que conozco hasta ahora
  private get allOptions(): Catalog[] {
    return [...this.data, ...this.optionsPool];
  }

  //CVA
  writeValue(value: any): void {
    if (!value) {
      this.selectedIds = [];
    } else if (Array.isArray(value)) {
      this.selectedIds = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // cuando se abre el panel, mostramos algo inicial
  onOpenedChange(opened: boolean) {
    if (opened) {
      // primer load: muestra data local o últimos del pool
      if (!this.remote) {
        this.filteredOptions = this.data;
      } else {
        this.filteredOptions = this.optionsPool.slice(-10).reverse();
      }
    }
  }

  onSearch(term: string) {
    this.search$.next(term);
  }

  onSelectionChange() {
    // mat-select ya actualizó el value en el control
    const controlVal = this.ngControl?.control?.value;
    this.selectedIds = Array.isArray(controlVal) ? controlVal : [];
    this.onChange(this.selectedIds);
    this.onTouched();
  }

  // errores 
  get hasError(): boolean {
    const control = this.ngControl?.control;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get firstErrorMessage(): string {
    const errors = this.ngControl?.control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio';
    return this.errorMessage;
  }

  // ===== helpers datos =====
  private filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) =>
      item.name.toLowerCase().includes(lower)
    );
  }

  private fetchRemote(search: string) {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      case 'project':
        return this.catalogsService.projectsCatalog(search);
      default:
        return of([]);
    }
  }

  private addToPool(results: Catalog[]) {
    for (const item of results) {
      const exists = this.optionsPool.some((o) => o.id === item.id);
      if (!exists) this.optionsPool.push(item);
    }
  }

  private filterFromPool(term: string): Catalog[] {
    const lower = term.toLowerCase();
    return this.optionsPool.filter((o) =>
      o.name.toLowerCase().includes(lower)
    );
  }
}
