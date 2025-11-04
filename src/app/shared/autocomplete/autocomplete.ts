import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs';
import { Catalog } from '../interfaces/general-interfaces';
import { CatalogsService } from '../services/catalogs.service';

@Component({
  selector: 'app-autocomplete',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatOptionModule],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
  providers: [
    {
      // Registramos este componente como un "control de formulario" personalizado
      // para que Angular Reactive Forms lo pueda usar igual que un <input>, <select>, etc.
      provide: NG_VALUE_ACCESSOR,
      // Le decimos a Angular: "usa ESTA MISMA clase (el componente) como value accessor"
      // forwardRef se usa porque la clase todavía no está declarada en este punto
      useExisting: forwardRef(() => Autocomplete),
      // multi: true permite que haya varios value accessors registrados
      // (no reemplaza a los que ya existen, se suma)
      multi: true,
    },
  ]
})
export class Autocomplete implements ControlValueAccessor {
  private readonly catalogsService = inject(CatalogsService);

  // texto arriba del input
  @Input() label = 'Seleccionar';
  // placeholder del input
  @Input() placeholder = 'Buscar...';
  // si se va a consultar al backend
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  // lista local (cuando remote = false)
  @Input() data: Catalog[] = [];

  // para avisarle al padre si quiere el objeto completo
  @Output() optionSelected = new EventEmitter<Catalog>();

  // listado filtrado que se pinta en el autocomplete
  filtered$: Observable<Catalog[]> = of([]);

  // valor actual (id o Catalog)
  innerValue: string | Catalog | null = null;

  // funcs de CVA
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };


  // CVA: escribe el valor que viene del padre (formControl / formGroup)
  writeValue(value: any): void {
    this.innerValue = value;
  }

  registerOnChange(fn: any): void {
    console.log(fn);
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // se dispara cada vez que escribe el usuario
  onInputChange(term: string | Catalog) {
    // si viene objeto, lo dejamos pasar
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

    // avisamos al form que el valor cambió (guardamos el id, no el objeto)
    this.onChange(typeof term === 'string' ? term : term?.id);
  }

  // cuando el usuario selecciona una opción del dropdown
  onOptionSelected(option: Catalog) {
    this.innerValue = option.id;
    this.onChange(option.id);
    this.optionSelected.emit(option);
  }

  // para que mat-autocomplete muestre el nombre y no el id
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    if (typeof value !== 'string') return value.name;

    // si es string (id), lo buscamos en la lista local (sirve cuando editas)
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  fetchRemote(search: string): Observable<Catalog[]> {
    // aquí puedes hacer un switch por tipo
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      // case 'project': return this.catalogsService.projectCatalog(search);
      default:
        return of([]);
    }
  }

  filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) => item.name.toLowerCase().includes(lower));
  }
}