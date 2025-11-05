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
  @Input() errorMessage = 'Este campo es obligatorio.';

  // si el padre quiere el objeto completo al seleccionar
  @Output() optionSelected = new EventEmitter<Catalog>();

  // observable que consume el template para pintar las opciones
  filtered$: Observable<Catalog[]> = of([]);

  // subject donde empujamos lo que escribe el usuario
  private input$ = new Subject<string>();

  // valor interno que se muestra en el input
  innerValue: string | Catalog | null = null;

  // funciones que nos da Angular para notificar cambios y "tocado"
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

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
  writeValue(value: any) {
    this.innerValue = value;
  }

  // el form nos dice qué función usar para notificar cambios
  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  // el form nos dice qué función usar para marcar como tocado
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  // ====== Eventos del template ======

  // se llama en (input)
  onInputChange(term: string | Catalog) {
    // normalizamos el valor a texto
    const text = typeof term === 'string' ? term : term?.name ?? '';

    // notificamos al form que el valor cambió (enviamos id o texto)
    this.onChange(typeof term === 'string' ? term : term?.id);

    // y mandamos el texto al subject para que pase por debounce + búsqueda
    this.input$.next(text);
  }

  // se llama cuando el usuario selecciona una opción del autocomplete
  onOptionSelected(option: Catalog) {
    // guardamos el id como valor interno
    this.innerValue = option.id;
    // notificamos al form el id elegido
    this.onChange(option.id);
    // lo marcamos como "tocado"
    this.onTouched();
    // y emitimos el objeto completo por si el padre lo necesita
    this.optionSelected.emit(option);
  }

  // cuando el input pierde el foco lo marcamos como tocado
  onBlur() {
    this.onTouched();
  }
  // ====== Helpers ======

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
