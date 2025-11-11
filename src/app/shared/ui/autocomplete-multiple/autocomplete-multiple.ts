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
  tap,
} from 'rxjs';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

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
  ],
  templateUrl: './autocomplete-multiple.html',
  styleUrl: './autocomplete-multiple.scss',
    // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutocompleteMultiple implements ControlValueAccessor {
  // servicio (igual que tu otro)
  private readonly catalogsService = inject(CatalogsService);

  // inputs igualitos
  @Input() label = 'Seleccionar';
  @Input() placeholder = 'Buscar...';
  @Input() remote = false;
  @Input() catalogType: 'supplier' | 'project' = 'supplier';
  @Input() errorMessage = 'Este campo es obligatorio';

  // pool en memoria para no pegarle al backend siempre
  private optionsPool: Catalog[] = [];

  // lo que escribe el user
  private input$ = new Subject<string>();

  // lista que se muestra
  filtered$: Observable<Catalog[]> = of([]);

  // lo que está seleccionado (múltiple)
  selected: Catalog[] = [];

  // para mostrar en el input lo que escribe
  displayValue = '';

  disabled = false;

  // cva callbacks
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // misma lógica de búsquedas que tu autocomplete
    this.filtered$ = this.input$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((text) => {
        const term = (text ?? '').trim();

        // si no escribió nada -> últimos del pool
        if (term.length < 2) return of(this.getLastFromPool(5));

        if (this.remote) {
          const localMatches = this.filterFromPool(term);
          if (localMatches.length) return of(localMatches);

          return this.fetchRemote(term).pipe(tap((res) => this.addToPool(res)));
        }

        // modo local (si quisieras pasarle data externa, la podrías meter aquí)
        return of(this.filterFromPool(term));
      })
    );
  }

  // ====== CVA ======
  writeValue(value: any): void {
    // esperamos un array de ids o de objetos
    if (!value) {
      this.selected = [];
      return;
    }

    // si vienen ids pero en el pool no están, los vamos a ir completando cuando el user busque
    if (Array.isArray(value)) {
      // si vienen como [{id,name}, ...]
      if (value.length && typeof value[0] === 'object') {
        this.selected = value as Catalog[];
      } else {
        // vienen ids: [1,2,3]
        const ids = value as (string | number)[];
        this.selected = ids
          .map((id) => this.optionsPool.find((o) => o.id === id))
          .filter(Boolean) as Catalog[];
      }
      this.emitToForm();
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

  // ====== eventos ======
  onInputChange(term: string) {
    this.displayValue = term;
    this.input$.next(term);
  }

  onOptionSelected(option: Catalog) {
    // si ya está, no lo agregues
    const exists = this.selected.some((s) => s.id === option.id);
    if (!exists) {
      this.selected.push(option);
      // también lo agregamos al pool
      this.addToPool([option]);
      this.emitToForm();
    }
    // limpiar input para que pueda buscar otro
    this.displayValue = '';
  }

  removeSelected(item: Catalog) {
    this.selected = this.selected.filter((s) => s.id !== item.id);
    this.emitToForm();
    this.onTouched();
  }

  // ====== helpers ======
  private emitToForm() {
    // mandamos solo ids, igual que harías en un filtro
    const ids = this.selected.map((s) => s.id);
    this.onChange(ids);
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

  // ====== pool ======
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

  private getLastFromPool(limit: number): Catalog[] {
    return this.optionsPool.slice(-limit).reverse();
  }

  private filterFromPool(term: string): Catalog[] {
    const lower = term.toLowerCase();
    return this.optionsPool.filter((opt) =>
      opt.name.toLowerCase().includes(lower)
    );
  }

  private addToPool(results: Catalog[]) {
    for (const item of results) {
      const exists = this.optionsPool.some((opt) => opt.id === item.id);
      if (!exists) this.optionsPool.push(item);
    }
    // límite de memoria
    if (this.optionsPool.length > 200) {
      this.optionsPool.splice(0, this.optionsPool.length - 200);
    }
  }
}