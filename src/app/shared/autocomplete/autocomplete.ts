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
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
} from 'rxjs';
import { Catalog } from '../interfaces/general-interfaces';
import { CatalogsService } from '../services/catalogs.service';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatIcon,
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

  // ====== Inputs de configuración ======
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];

  // 👇 NUEVO: texto a mostrar cuando vienes en edición y no hay data local
  @Input() initialDisplay = '';

  // para mostrar error desde afuera
  @Input() showError = false;
  @Input() errorMessage = 'Este campo es obligatorio';

  @Output() optionSelected = new EventEmitter<Catalog>();

  // opciones que se pintan
  filtered$: Observable<Catalog[]> = of([]);

  // lo que el usuario escribe
  private input$ = new Subject<string>();

  // valor real del control (id o lo que mande el form)
  innerValue: string | Catalog | null = null;

  // lo que se ve en el input
  displayValue = '';

  // cva
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.filtered$ = this.input$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((text) => (text ?? '').length >= 2),
      switchMap((text) => {
        if (this.remote) {
          return this.fetchRemote(text);
        }
        return of(this.filterLocal(text));
      }),
    );
  }

  // ===== CVA =====
writeValue(value: any): void {
  console.log(value);
  
  this.innerValue = value;

  // si viene el objeto completo
  if (value && typeof value !== 'string') {
    this.displayValue = value.name ?? '';
    return;
  }

  // 2) si viene id y tienes data local, intenta resolverlo
  if (typeof value === 'string' && this.data?.length) {
    const found = this.data.find((d) => d.id === value);
    this.displayValue = found ? found.name : '';
    return;
  }

  console.log('init');
  
  // 3) si estás en remoto y no tienes data, usa el initialDisplay
  if (this.initialDisplay) {
    this.displayValue = this.initialDisplay;
    return;
  }

  // 4) fallback
  this.displayValue = '';
}


  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  // cuando escribe
  onInputChange(term: string | Catalog) {
    const text = typeof term === 'string' ? term : term?.name ?? '';

    // actualizamos lo visible
    this.displayValue = text;

    // notificamos al form
    this.onChange(typeof term === 'string' ? term : term?.id);

    // disparamos búsqueda
    this.input$.next(text);
  }

  // cuando selecciona una opción
  onOptionSelected(option: Catalog) {
    this.innerValue = option.id;
    this.displayValue = option.name;
    this.onChange(option.id);
    this.onTouched();
    this.optionSelected.emit(option);
  }

  onBlur() {
    this.onTouched();
  }

  // para el mat-autocomplete
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    if (typeof value !== 'string') return value.name;
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  fetchRemote(search: string): Observable<Catalog[]> {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      case 'project':
        return this.catalogsService.projectsCatalog(search);
      default:
        return of([]);
    }
  }

  filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) =>
      item.name.toLowerCase().includes(lower),
    );
  }
}
