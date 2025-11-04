import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  inject,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs';
import { Catalog } from '../interfaces/general-interfaces';
import { CatalogsService } from '../services/catalogs.service';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
  ],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Autocomplete),
      multi: true,
    },
  ],
})
export class Autocomplete implements ControlValueAccessor {
  private readonly catalogsService = inject(CatalogsService);

  // ui
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];

  // opcional: si el padre quiere el objeto completo
  @Output() optionSelected = new EventEmitter<Catalog>();

  filtered$: Observable<Catalog[]> = of([]);

  // lo que muestra el input (puede ser string o el id)
  innerValue: string | Catalog | null = null;

  // funcs que nos pone Angular
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  // ===== CVA =====
  writeValue(value: any): void {
    // cuando el padre setea el valor (editar)
    this.innerValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  // ===============

  onInputChange(term: string | Catalog) {
    const text = typeof term === 'string' ? term : term?.name ?? '';

    if (this.remote) {
      this.filtered$ = of(text).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => this.fetchRemote(search)),
      );
    } else {
      this.filtered$ = of(this.filterLocal(text));
    }

    // avisamos al form que cambió (mandamos id o texto)
    this.onChange(typeof term === 'string' ? term : term?.id);
  }

  // usuario selecciona una opción
  onOptionSelected(option: Catalog) {
    // lo que se ve en el input
    this.innerValue = option.id;
    // lo que guarda el form
    this.onChange(option.id);
    // lo marcamos como tocado ✅
    this.onTouched();
    // extra: el padre puede recibir el objeto
    this.optionSelected.emit(option);
  }

  // si sale del input sin elegir
  onBlur() {
    this.onTouched();
  }

  // para que muestre nombre y no id
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    if (typeof value !== 'string') return value.name;
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  // remoto
  fetchRemote(search: string): Observable<Catalog[]> {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      default:
        return of([]);
    }
  }

  // local
  filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) =>
      item.name.toLowerCase().includes(lower),
    );
  }
}
