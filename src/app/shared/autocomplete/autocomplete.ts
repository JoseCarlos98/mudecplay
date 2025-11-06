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
    MatIcon
  ],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
  providers: [
    {
      // registramos este componente como un control de formulario personalizado
      // así puede usarse con formControlName / formControl
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Autocomplete),
      multi: true,
    },
  ],
})
export class Autocomplete implements ControlValueAccessor {
  // servicio para obtener catálogos remotos
  private readonly catalogsService = inject(CatalogsService);

  // ====== Inputs de configuración de UI ======
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];

  // manejo de error desde el padre (el form vive afuera)
  @Input() showError = false;
  @Input() errorMessage = 'Este campo es obligatorio';

  // si el padre quiere el objeto completo al seleccionar
  @Output() optionSelected = new EventEmitter<Catalog>();

  // observable que consume el template para pintar las opciones
  filtered$: Observable<Catalog[]> = of([]);

  // subject donde empujamos lo que escribe el usuario
  private input$ = new Subject<string>();

  // valor interno que se muestra en el input
  innerValue: string | Catalog | null = null;

  displayValue: string = '';

  // funciones que nos da Angular para notificar cambios y "tocado"
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor() {
    // armamos el pipeline una sola vez:
    // 1) esperamos a que el usuario deje de escribir (debounce)
    // 2) evitamos peticiones repetidas (distinctUntilChanged)
    // 3) según el modo, buscamos remoto o filtramos local
    this.filtered$ = this.input$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((text) => {
        if (this.remote) {
          return this.fetchRemote(text);
        }
        return of(this.filterLocal(text));
      }),
    );
  }

  // ====== Métodos de ControlValueAccessor ======

  // el form padre nos manda un valor (ej. modo edición)
  writeValue(value: any): void {
    this.innerValue = value;

    // si viene objeto
    if (value && typeof value !== 'string') {
      this.displayValue = value.name;
      return;
    }

    // si viene un id (string) y tienes data local, intenta resolverlo
    if (typeof value === 'string' && this.data?.length) {
      const found = this.data.find(d => d.id === value);
      this.displayValue = found ? found.name : '';
    } else {
      // si no hay data todavía, lo dejamos vacío
      this.displayValue = '';
    }
  }

  // el form nos dice qué función usar para notificar cambios
  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  // el form nos dice qué función usar para marcar como tocado
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  onInputChange(term: string | Catalog) {
    const text = typeof term === 'string' ? term : term?.name ?? '';

    // actualizamos lo que se ve
    this.displayValue = text;

    // notificamos al form (si es string no sabemos el id todavía)
    this.onChange(typeof term === 'string' ? term : term?.id);

    // disparamos búsqueda
    this.input$.next(text);
  }

  onOptionSelected(option: Catalog) {
    this.innerValue = option.id;      // para el form
    this.displayValue = option.name;  // para el input
    this.onChange(option.id);
    this.onTouched();
    // y emitimos el objeto completo por si el padre lo necesita
    this.optionSelected.emit(option);
  }

  // cuando el input pierde el foco lo marcamos como tocado
  onBlur() {
    this.onTouched();
  }


  // usada por mat-autocomplete para mostrar texto legible
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    // si ya viene el objeto, mostramos su name
    if (typeof value !== 'string') return value.name;
    // si viene un id (string), buscamos en la lista local
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  // consulta al backend según el tipo
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

  // filtrado simple en memoria
  filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) =>
      item.name.toLowerCase().includes(lower),
    );
  }
}
