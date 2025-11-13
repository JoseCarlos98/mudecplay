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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './autocomplete-multiple.html',
  styleUrls: ['./autocomplete-multiple.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMultiSelect implements ControlValueAccessor {
  //  Inputs de configuración 
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Selecciona';
  @Input() searchPlaceholder = 'Todos';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];
  @Input() errorMessage = 'Este campo es obligatorio';

  //  estado interno 
  disabled = false;

  /** opciones que se muestran en el panel en este momento */
  filteredOptions: Catalog[] = [];

  /** ids seleccionados que viajan al form */
   selectedIds: Array<number | string> = [];

  /** pool local con todo lo que ya fuimos encontrando */
  private optionsPool: Catalog[] = [];

  /** stream de búsqueda */
  private search$ = new Subject<string>();

  // CVA callbacks
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  //  inyecciones 
  private readonly catalogsService = inject(CatalogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // armar el flujo de búsqueda
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const text = term.trim();

          // LOCAL
          if (!this.remote) {
            this.filteredOptions = this.filterLocal(text);
            this.cdr.markForCheck();
            return of(null);
          }

          // REMOTO: primero intento con lo que ya tengo en pool
          const matches = this.filterFromPool(text);
          if (matches.length) {
            this.filteredOptions = matches;
            this.cdr.markForCheck();
            return of(null);
          }

          // si no hay en pool → pegarle al backend
          return this.fetchRemote(text).pipe(
            tap((results) => {
              this.addToPool(results);
              this.filteredOptions = this.filterFromPool(text);
              this.cdr.markForCheck();
            })
          );
        })
      )
      .subscribe();
  }

  //  getter de labels para el trigger 
  get selectedLabels(): string[] {
    return this.selectedIds
      .map((id) => this.allOptions.find((o) => o.id === id))
      .filter((x): x is Catalog => !!x)
      .map((o) => o.name);
  }

  private get allOptions(): Catalog[] {
    return [...this.data, ...this.optionsPool];
  }

  //  ControlValueAccessor 
  writeValue(value: any): void {
    if (!value) {
      this.selectedIds = [];
    } else if (Array.isArray(value)) {
      this.selectedIds = value;
    }
    // como es OnPush, márcalo
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  //  eventos del template 
  onOpenedChange(opened: boolean) {
    if (opened) {
      // si es local, muestro todo
      if (!this.remote) {
        this.filteredOptions = this.data;
      } else {
        // remoto: muestro los últimos 10 que tengo
        this.filteredOptions = this.optionsPool.slice(-10).reverse();
      }
      this.cdr.markForCheck();
    }
  }

  onSearch(term: string) {
    this.search$.next(term);
  }

  onSelectionChange() {
    // el <mat-select> ya actualizó el valor en el form
    const controlVal = this.ngControl?.control?.value;
    this.selectedIds = Array.isArray(controlVal) ? controlVal : [];
    this.onChange(this.selectedIds);
    this.onTouched();
    // marcar cambio porque OnPush
    this.cdr.markForCheck();
  }

  //  errores 
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

  //  helpers datos 
  private filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) => item.name.toLowerCase().includes(lower));
  }

  private fetchRemote(search: string) {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      case 'project':
        return this.catalogsService.projectsCatalog(search);
      default:
        return of([] as Catalog[]);
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
