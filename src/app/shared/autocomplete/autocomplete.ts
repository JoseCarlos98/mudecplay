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

  // ----- UI -----
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() data: Catalog[] = [];

  // 👇 control de errores desde el padre
  @Input() showError:any = false;
  @Input() errorMessage = 'Este campo es obligatorio.';

  @Output() optionSelected = new EventEmitter<Catalog>();

  filtered$: Observable<Catalog[]> = of([]);

  innerValue: string | Catalog | null = null;

  // CVA
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.innerValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

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

    this.onChange(typeof term === 'string' ? term : term?.id);
  }

  onOptionSelected(option: Catalog) {
    this.innerValue = option.id;
    this.onChange(option.id);
    this.onTouched();
    this.optionSelected.emit(option);
  }

  onBlur() {
    this.onTouched();
  }

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
