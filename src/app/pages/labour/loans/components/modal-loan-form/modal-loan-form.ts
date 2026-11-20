import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  take,
} from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../shared/ui/btns-section/btns-section';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../../shared/interfaces/general-interfaces';
import { CatalogsService } from '../../../../../shared/services/catalogs.service';
import { LoansService } from '../../services/loans.service';

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** El motivo debe contener al menos cinco caracteres útiles, no solo espacios. */
const validReason: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return value.length >= 5 ? null : { minTrimmedLength: true };
};

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-loan-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ModuleHeader,
    BtnsSection,
    InputDate,
    InputField,
    LoadingOverlay,
  ],
  templateUrl: './modal-loan-form.html',
  styleUrl: './modal-loan-form.scss',
})
export class ModalLoanForm {
  private readonly fb = inject(FormBuilder);
  private readonly catalogs = inject(CatalogsService);
  private readonly loans = inject(LoansService);
  private readonly dialogRef = inject(MatDialogRef<ModalLoanForm>);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;
  message = '';

  readonly form = this.fb.group({
    // Es una selección individual: el autocomplete-multiple es para filtros,
    // por eso aquí conservamos el autocomplete individual de Angular Material.
    employee: this.fb.control<Catalog | string | null>(null, Validators.required),
    requested_on: this.fb.nonNullable.control(localDate(), Validators.required),
    principal_amount: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999999999.99),
    ]),
    reason: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
      validReason,
    ]),
  });

  readonly displayEmployee = (value: Catalog | string | null): string =>
    typeof value === 'string' ? value : value?.name ?? '';

  /** Busca empleados en el catálogo existente; no se descarga todo el padrón. */
  readonly employeeOptions$ = this.form.controls.employee.valueChanges.pipe(
    startWith(this.form.controls.employee.value),
    map((value) => (typeof value === 'string' ? value.trim() : '')),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((search) =>
      search.length >= 2
        ? this.catalogs.employeesCatalog(search).pipe(
            catchError((error) => {
              console.error('No fue posible consultar el catálogo de empleados:', error);
              return of([] as Catalog[]);
            }),
          )
        : of([] as Catalog[]),
    ),
    takeUntilDestroyed(this.destroyRef),
  );

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.message = ''; });
  }

  private get selectedEmployeeId(): number | null {
    const selected = this.form.controls.employee.value;
    if (!selected || typeof selected === 'string') return null;

    const id = Number(selected.id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  get canSave(): boolean {
    return !this.saving && this.form.valid && this.selectedEmployeeId !== null;
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.cancel();
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    if (action === 'cancel') this.cancel();
    if (action === 'save') this.save();
  }

  cancel(): void {
    if (!this.saving) this.dialogRef.close(false);
  }

  save(): void {
    if (this.saving) return;
    this.message = '';

    const employeeId = this.selectedEmployeeId;
    const value = this.form.getRawValue();
    const principal = Number(value.principal_amount);
    const reason = value.reason.trim();

    if (this.form.invalid || employeeId === null) {
      this.form.markAllAsTouched();
      this.message = 'Selecciona un empleado del catálogo y completa los campos obligatorios.';
      return;
    }

    if (
      !Number.isFinite(principal) ||
      principal < 0.01 ||
      principal > 9999999999.99 ||
      Math.abs(Math.round(principal * 100) - principal * 100) > 1e-7
    ) {
      this.message = 'El importe debe ser mayor que cero y tener máximo dos decimales.';
      return;
    }

    if (reason.length < 5 || reason.length > 500) {
      this.message = 'El motivo debe contener entre 5 y 500 caracteres.';
      return;
    }

    // IMPORTANTE: esta operación solo solicita el préstamo; NO lo desembolsa.
    this.saving = true;
    this.loans.createLoan({
      employee_id: employeeId,
      requested_on: value.requested_on,
      principal_amount: principal,
      reason,
    })
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (error: unknown) => {
          console.error('No se pudo registrar la solicitud de préstamo:', error);
          this.message = this.resolveErrorMessage(error);
        },
      });
  }

  private resolveErrorMessage(error: unknown): string {
    const response = error as {
      status?: number;
      error?: { message?: string | string[] };
    };

    if (response?.status === 401) {
      return 'Tu sesión venció. Inicia sesión nuevamente antes de guardar.';
    }
    if (response?.status === 403) {
      return 'Tu usuario no tiene permiso para registrar préstamos.';
    }

    const detail = response?.error?.message;
    if (Array.isArray(detail)) return detail.join(' ');
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    return 'No fue posible registrar la solicitud. Intenta nuevamente.';
  }
}
