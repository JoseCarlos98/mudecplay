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
  ChangeDetectorRef,
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';

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
    MatButtonModule,
  ],
  templateUrl: './autocomplete.html',
  styleUrls: ['./autocomplete.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Autocomplete implements ControlValueAccessor {
  // ==========================
  // Servicios
  // ==========================

  private readonly catalogsService =
    inject(CatalogsService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  // ==========================
  // Inputs de configuración
  // ==========================

  @Input() label: string = 'Seleccionar';

  @Input() placeholder: string = 'Buscar';

  @Input() remote: boolean = false;

  /**
   * Valor que se manda al FormControl al seleccionar.
   *
   * id:
   *   option.id
   *
   * name:
   *   option.name
   */
  @Input() valueMode: 'id' | 'name' = 'id';

  /**
   * Muestra un icono de información junto al label.
   *
   * Por defecto está apagado para no afectar
   * los autocompletes existentes.
   */
  @Input() showInfo: boolean = false;

  /**
   * Texto mostrado en el tooltip del icono de información.
   */
  @Input() infoTooltip: string = '';

  @Input() catalogType:
    | 'supplier'
    | 'project'
    | 'responsible'
    | 'client'
    | 'product'
    | 'purchaseOrderRequesterCandidate'
    | 'purchaseOrderAuthorizerCandidate'
    | 'expenseConcept' =
    'supplier';

  @Input() data: Catalog[] = [];

  /**
   * Cuando en editar ya se conoce el nombre
   * que se debe mostrar.
   */
  @Input() initialDisplay: string = '';

  /**
   * Mensaje por defecto cuando no existe
   * un mensaje específico en el FormControl.
   */
  @Input() errorMessage =
    'Este campo es obligatorio';

  // ==========================
  // Outputs
  // ==========================

  @Output()
  optionSelected =
    new EventEmitter<Catalog>();

  // ==========================
  // Estado
  // ==========================

  filtered$: Observable<Catalog[]> =
    of([]);

  private input$ =
    new Subject<string>();

  private innerValue:
    | number
    | string
    | Catalog
    | null =
    null;

  private optionsPool: Catalog[] = [];

  displayValue: string = '';

  disabled: boolean = false;

  // ==========================
  // CVA callbacks
  // ==========================

  private onChange:
    (val: any) => void =
    () => {};

  private onTouched:
    () => void =
    () => {};

  // ==========================
  // Constructor
  // ==========================

  constructor(
    @Optional()
    @Self()
    private ngControl: NgControl,
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    this.filtered$ =
      this.input$.pipe(
        debounceTime(300),

        distinctUntilChanged(),

        switchMap((text) => {
          const term =
            (text ?? '').trim();

          /**
           * Si todavía no escribió mínimo
           * 2 caracteres mostramos últimos
           * elementos del pool.
           */
          if (term.length < 2) {
            return of(
              this.getLastFromPool(5),
            );
          }

          /**
           * Modo remoto.
           */
          if (this.remote) {
            const localMatches =
              this.filterFromPool(term);

            /**
             * Si ya tenemos coincidencias
             * en memoria evitamos otra llamada.
             */
            if (
              localMatches.length > 0
            ) {
              return of(localMatches);
            }

            /**
             * Si no existe en el pool,
             * consultamos backend.
             */
            return this
              .fetchRemote(term)
              .pipe(
                tap((results) =>
                  this.addToPool(
                    results,
                  ),
                ),
              );
          }

          /**
           * Modo local.
           */
          return of(
            this.filterLocal(term),
          );
        }),
      );
  }

  // ==========================
  // Validaciones UI
  // ==========================

  get showRequiredMark(): boolean {
    const control =
      this.ngControl?.control;

    if (
      !control ||
      !control.validator
    ) {
      return false;
    }

    const result =
      control.validator(
        {} as any,
      );

    return !!result?.['required'];
  }

  // ==========================
  // ControlValueAccessor
  // ==========================

  writeValue(value: any): void {
    this.innerValue = value;

    /**
     * Cuando trabajamos con nombres,
     * el valor del FormControl ya es texto.
     */
    if (
      this.valueMode === 'name' &&
      typeof value === 'string'
    ) {
      this.displayValue = value;

      this.cdr.markForCheck();

      return;
    }

    /**
     * Si viene Catalog completo.
     */
    if (
      value &&
      typeof value === 'object'
    ) {
      this.displayValue =
        value.name ?? '';

      this.cdr.markForCheck();

      return;
    }

    /**
     * Si viene id y tenemos catálogo local.
     */
    if (
      (
        typeof value === 'number' ||
        typeof value === 'string'
      ) &&
      this.data?.length
    ) {
      const found =
        this.data.find(
          (item) =>
            item.id === value,
        );

      this.displayValue =
        found
          ? found.name
          : '';

      this.cdr.markForCheck();

      return;
    }

    /**
     * En remoto podemos recibir
     * el nombre inicial aparte.
     */
    if (this.initialDisplay) {
      this.displayValue =
        this.initialDisplay;

      this.cdr.markForCheck();

      return;
    }

    this.displayValue = '';

    this.cdr.markForCheck();
  }

  registerOnChange(
    fn: any,
  ): void {
    this.onChange = fn;
  }

  registerOnTouched(
    fn: any,
  ): void {
    this.onTouched = fn;
  }

  setDisabledState(
    isDisabled: boolean,
  ): void {
    this.disabled =
      isDisabled;

    this.cdr.markForCheck();
  }

  // ==========================
  // Eventos UI
  // ==========================

  /**
   * Cuando el usuario escribe.
   *
   * Esto permite texto libre,
   * necesario para Concepto.
   */
  onInputChange(
    term: string | Catalog,
  ): void {
    const text =
      typeof term === 'string'
        ? term
        : term?.name ?? '';

    this.displayValue = text;

    /**
     * Al escribir libremente mandamos
     * el texto al FormControl.
     */
    this.onChange(
      typeof term === 'string'
        ? term
        : term?.id,
    );

    this.input$.next(text);

    this.cdr.markForCheck();
  }

  /**
   * Cuando el usuario selecciona
   * una opción del autocomplete.
   */
  onOptionSelected(
    option: Catalog,
  ): void {
    const value =
      this.valueMode === 'name'
        ? option.name
        : option.id;

    this.innerValue = value;

    this.displayValue =
      option.name;

    this.onChange(value);

    this.onTouched();

    this.optionSelected.emit(
      option,
    );

    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.onTouched();
  }

  clearInput(): void {
    this.displayValue = '';

    this.innerValue = null;

    this.onChange(null);

    this.onTouched();

    if (
      !this.remote &&
      this.data?.length
    ) {
      this.input$.next('');
    }

    this.cdr.markForCheck();
  }

  // ==========================
  // Display
  // ==========================

  displayWith =
    (value: any): string => {
      if (!value) {
        return '';
      }

      if (
        typeof value === 'object'
      ) {
        return value.name ?? '';
      }

      const found =
        this.data?.find(
          (item) =>
            item.id === value,
        );

      return found
        ? found.name
        : String(value);
    };

  // ==========================
  // Errores
  // ==========================

  get hasError(): boolean {
    const control =
      this.ngControl?.control;

    return (
      !!control &&
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }

  get firstErrorMessage():
    string {

    const errors =
      this.ngControl
        ?.control
        ?.errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'Este campo es obligatorio';
    }

    return this.errorMessage;
  }

  // ==========================
  // Catálogos remotos
  // ==========================

  private fetchRemote(
    search: string,
  ): Observable<Catalog[]> {

    switch (
      this.catalogType
    ) {
      case 'product':
        return this
          .catalogsService
          .productsCatalog(
            search,
          );

      case 'supplier':
        return this
          .catalogsService
          .suppliersCatalog(
            search,
          );

      case 'project':
        return this
          .catalogsService
          .projectsCatalog(
            search,
          );

      case 'responsible':
        return this
          .catalogsService
          .responsibleCatalog(
            search,
          );

      case 'client':
        return this
          .catalogsService
          .clientsCatalog(
            search,
          );

      case 'purchaseOrderRequesterCandidate':
        return this
          .catalogsService
          .purchaseOrderRequesterCandidatesCatalog(
            search,
          );

      case 'purchaseOrderAuthorizerCandidate':
        return this
          .catalogsService
          .purchaseOrderAuthorizerCandidatesCatalog(
            search,
          );

      case 'expenseConcept':
        return this
          .catalogsService
          .expenseConceptsCatalog(
            search,
          );

      default:
        return of([]);
    }
  }

  // ==========================
  // Helpers
  // ==========================

  private filterLocal(
    term: string,
  ): Catalog[] {

    if (!term) {
      return this.data;
    }

    const lower =
      term.toLowerCase();

    return this.data.filter(
      (item) =>
        item.name
          .toLowerCase()
          .includes(lower),
    );
  }

  private getLastFromPool(
    limit: number,
  ): Catalog[] {

    return this.optionsPool
      .slice(-limit)
      .reverse();
  }

  private filterFromPool(
    term: string,
  ): Catalog[] {

    const lower =
      term.toLowerCase();

    return this.optionsPool.filter(
      (option) =>
        option.name
          .toLowerCase()
          .includes(lower),
    );
  }

  private addToPool(
    results: Catalog[],
  ): void {

    for (
      const item of results
    ) {
      const exists =
        this.optionsPool.some(
          (option) =>
            option.id === item.id,
        );

      if (!exists) {
        this.optionsPool.push(
          item,
        );
      }
    }

    if (
      this.optionsPool.length >
      200
    ) {
      this.optionsPool.splice(
        0,
        this.optionsPool.length -
          200,
      );
    }
  }
}