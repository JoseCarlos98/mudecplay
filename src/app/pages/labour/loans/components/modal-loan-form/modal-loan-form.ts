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
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  finalize,
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
import { Autocomplete } from '../../../../../shared/ui/autocomplete/autocomplete';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../../shared/interfaces/general-interfaces';
import { EmployeesService } from '../../../employees/services/employees.service';
import { LoansService } from '../../services/loans.service';

function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Valida la longitud real del motivo, sin contar espacios exteriores. */
const validReason: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return value.length >= 5 ? null : { minTrimmedLength: true };
};

/** La precisión del dinero pertenece a Reactive Forms, no al click de Guardar. */
const validMoneyPrecision: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return { invalidMoney: true };
  const cents = amount * 100;
  return Math.abs(Math.round(cents) - cents) <= 1e-7
    ? null
    : { moneyPrecision: true };
};

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-loan-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    ModuleHeader,
    BtnsSection,
    InputDate,
    InputField,
    Autocomplete,
    LoadingOverlay,
  ],
  templateUrl: './modal-loan-form.html',
  styleUrl: './modal-loan-form.scss',
})
export class ModalLoanForm {
  private readonly fb = inject(FormBuilder);
  private readonly employeesService = inject(EmployeesService);
  private readonly loans = inject(LoansService);
  private readonly dialogRef = inject(MatDialogRef<ModalLoanForm>);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  /** Catálogo real para el autocompletado individual compartido. */
  employeeCatalog: Catalog[] = [];
  selectedEmployee: Catalog | null = null;

  readonly form = this.fb.group({
    employee: this.fb.control<number | string | null>(null, Validators.required),
    requested_on: this.fb.nonNullable.control(localDate(), Validators.required),
    principal_amount: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999999999.99),
      validMoneyPrecision,
    ]),
    reason: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
      validReason,
    ]),
  });

  constructor() {
    this.employeesService.getCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => { this.employeeCatalog = catalog ?? []; },
        // El interceptor ya informa errores del backend.
        error: () => { this.employeeCatalog = []; },
      });

    // El CVA compartido emite un texto al escribir y un ID al seleccionar.
    // Nunca aceptamos texto libre como un empleado seleccionado.
    this.form.controls.employee.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.selectedEmployee && value !== this.selectedEmployee.id) {
          this.selectedEmployee = null;
        }
      });
  }

  onEmployeeSelected(employee: Catalog): void {
    const id = Number(employee?.id);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    this.selectedEmployee = employee;
  }

  private get selectedEmployeeId(): number | null {
    const employee = this.selectedEmployee;
    const raw = this.form.controls.employee.value;
    if (!employee || raw !== employee.id) return null;

    const id = Number(employee.id);
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
    const employeeId = this.selectedEmployeeId;

    // Seguridad ante un submit por Enter o un evento externo.
    // El botón usa exactamente esta misma condición para habilitarse.
    if (!this.canSave || employeeId === null) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.saving = true;
    this.loans.createLoan({
      employee_id: employeeId,
      requested_on: values.requested_on,
      principal_amount: Number(values.principal_amount),
      reason: values.reason.trim(),
    })
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => {},
      });
  }
}
