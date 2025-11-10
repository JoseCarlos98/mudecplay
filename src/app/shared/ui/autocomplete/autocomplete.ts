import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Optional,
  Self,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  Observable,
  of,
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
} from 'rxjs';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

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
    MatTooltipModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './autocomplete.html',
  styleUrls: ['./autocomplete.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Autocomplete implements ControlValueAccessor {
  // servicios
  private readonly catalogsService = inject(CatalogsService);

  // ====== Inputs de configuración ======
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote: boolean = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];

  // cuando en editar ya tienes el nombre, lo muestras
  @Input() initialDisplay: string = '';

  // mensaje por defecto (solo si no hay formControlName)
  @Input() errorMessage = 'Este campo es obligatorio';

  // output por si el padre quiere el objeto completo
  @Output() optionSelected = new EventEmitter<Catalog>();

  // lista filtrada que ve el usuario
  filtered$: Observable<Catalog[]> = of([]);

  // lo que el usuario va escribiendo
  private input$ = new Subject<string>();

  // valor REAL del form (id o lo que mandes)
  private innerValue: string | Catalog | null = null;

  // lo que se ve en el input
  displayValue: string = '';

  disabled: boolean = false;

  // CVA callbacks
  private onChange: (val: any) => void = () => { };
  private onTouched: () => void = () => { };

  // para leer estado del form y mostrar errores
  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // armar el stream de búsqueda
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

  // ======== CVA ========
  writeValue(value: any) {
    this.innerValue = value;

    // 1) si viene objeto
    if (value && typeof value !== 'string') {
      this.displayValue = value.name ?? '';
      return;
    }

    // 2) si viene id y hay data local
    if (typeof value === 'string' && this.data?.length) {
      const found = this.data.find((d) => d.id === value);
      this.displayValue = found ? found.name : '';
      return;
    }

    // 3) si estás en remoto y te pasan el nombre inicial
    if (this.initialDisplay) {
      this.displayValue = this.initialDisplay;
      return;
    }

    this.displayValue = '';
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }


  // cuando escribe
  onInputChange(term: string | Catalog) {
    const text = typeof term === 'string' ? term : term?.name ?? '';

    // actualizamos lo visible
    this.displayValue = text;

    // notificamos al form con el valor crudo (texto) por si valida required
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

  clearInput() {
    this.displayValue = '';
    this.innerValue = null;

    // avisamos al form que ahora no hay nada
    this.onChange(null);
    this.onTouched();

    // si quieres volver a mostrar la lista completa local
    if (!this.remote && this.data?.length) this.input$.next('');
  }

  // para el mat-autocomplete
  displayWith = (value: string | Catalog): string => {
    if (!value) return '';
    if (typeof value !== 'string') return value.name;
    const found = this.data.find((d) => d.id === value);
    return found ? found.name : value;
  };

  // ======== data ========
  private fetchRemote(search: string): Observable<Catalog[]> {
    switch (this.catalogType) {
      case 'supplier':
        return this.catalogsService.supplierCatalog(search);
      case 'project':
        return this.catalogsService.projectsCatalog(search);
      default:
        return of([]);
    }
  }

  private filterLocal(term: string): Catalog[] {
    if (!term) return this.data;
    const lower = term.toLowerCase();
    return this.data.filter((item) =>
      item.name.toLowerCase().includes(lower),
    );
  }
}
