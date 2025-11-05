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
      // registramos este componente como un control de formulario personalizado
      // para que Angular reactive forms pueda usarlo con formControlName
      provide: NG_VALUE_ACCESSOR,
      // forwardRef porque la clase todavía no está definida en este punto
      useExisting: forwardRef(() => Autocomplete),
      multi: true,
    },
  ],
})
export class Autocomplete implements ControlValueAccessor {
  // servicio que traerá los catálogos remotos
  private readonly catalogsService = inject(CatalogsService);

  // ----- props de UI configurables desde fuera -----
  @Input() label = 'Seleccionar';          // texto sobre el input
  @Input() placeholder = 'Buscar...';      // placeholder del input
  @Input() remote = false;                 // si true, busca al backend
  @Input() catalogType: 'supplier' | 'project' = 'supplier'; // tipo de catálogo a pedir
  @Input() data: Catalog[] = [];           // catálogo local para modo no remoto

  // control de errores desde el padre (porque el form vive arriba)
  @Input() showError = false;
  @Input() errorMessage: string = '';

  // si el padre necesita el objeto completo, lo emitimos
  @Output() optionSelected = new EventEmitter<Catalog>();

  // stream de opciones que se mostrarán en el autocomplete
  filtered$: Observable<Catalog[]> = of([]);

  // valor que se muestra actualmente en el input
  innerValue: string | Catalog | null = null;

  // ====== ControlValueAccessor ======
  // funciones que Angular nos inyecta para notificar cambios / touched
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  // cuando el padre setea un valor (ej. modo edición)
  writeValue(value: any): void {
    this.innerValue = value;
  }

  // Angular nos pasa la función que debemos llamar cuando cambie el valor
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  // Angular nos pasa la función que debemos llamar cuando el control es “tocado”
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // se dispara cuando el usuario escribe en el input
  onInputChange(term: string | Catalog) {
    // normalizamos a string
    const text = typeof term === 'string' ? term : term?.name ?? '';

    if (this.remote) {
      // modo remoto: cada que cambia el texto disparamos una búsqueda
      this.filtered$ = of(text).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => this.fetchRemote(search)),
      );
    } else {
      // modo local: filtramos el array que nos mandaron
      this.filtered$ = of(this.filterLocal(text));
    }

    // notificamos al form que el valor cambió (enviamos id o texto)
    this.onChange(typeof term === 'string' ? term : term?.id);
  }

  // cuando el usuario selecciona una opción del dropdown
  onOptionSelected(option: Catalog) {
    // mostramos el id en el input (podría ser option.name si quisieras)
    this.innerValue = option.id;
    // notificamos al form el id seleccionado
    this.onChange(option.id);
    // lo marcamos como tocado
    this.onTouched();
    // emitimos el objeto completo por si el padre lo quiere
    this.optionSelected.emit(option);
  }

  // cuando el input pierde el foco lo marcamos como tocado
  onBlur() {
    this.onTouched();
  }

  // usado por mat-autocomplete para mostrar el nombre y no el id
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    // si viene el objeto, devolvemos el nombre
    if (typeof value !== 'string') return value.name;
    // si viene el id (string), buscamos en la lista local
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  // llamada al backend según el tipo de catálogo
  fetchRemote(search: string): Observable<Catalog[]> {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      // aquí luego se agregan más catálogos
      default:
        return of([]);
    }
  }

  // filtro simple para modo local
  filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) => item.name.toLowerCase().includes(lower));
  }
}
