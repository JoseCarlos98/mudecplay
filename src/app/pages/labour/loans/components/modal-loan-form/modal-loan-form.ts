import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, finalize, map, of, startWith, switchMap, take } from 'rxjs';
import { Catalog } from '../../../../../shared/interfaces/general-interfaces';
import { CatalogsService } from '../../../../../shared/services/catalogs.service';
import { LoansService } from '../../services/loans.service';

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
@Component({
  selector: 'app-modal-loan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './modal-loan-form.html',
  styleUrl: './modal-loan-form.scss',
})
export class ModalLoanForm {
  private readonly fb = inject(FormBuilder);
  private readonly catalogService = inject(CatalogsService);
  private readonly loans = inject(LoansService);
  private readonly ref = inject(MatDialogRef<ModalLoanForm>);
  private readonly destroyRef = inject(DestroyRef);
  saving = false;
  message = '';
  readonly form = this.fb.group({
    employee: this.fb.control<Catalog | string | null>(null, Validators.required),
    requested_on: this.fb.nonNullable.control(localDate(), Validators.required),
    principal_amount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0.01), Validators.max(9999999999.99)]),
    reason: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]),
  });
  readonly displayEmployee = (value: Catalog | string | null): string =>
    typeof value === 'string' ? value : (value?.name ?? '');
  readonly employeeOptions$ = this.form.controls.employee.valueChanges.pipe(
    startWith(this.form.controls.employee.value),
    debounceTime(300),
    map((value) => typeof value === 'string' ? value.trim() : ''),
    switchMap((search) => search.length >= 2
      ? this.catalogService.employeesCatalog(search).pipe(catchError(() => of([] as Catalog[])))
      : of([] as Catalog[])),
  );
  cancel(): void { if (!this.saving) this.ref.close(false); }
  save(): void {
    this.message = '';
    const selected = this.form.controls.employee.value;
    if (this.form.invalid || !selected || typeof selected === 'string' || !Number.isSafeInteger(Number(selected.id)) || Number(selected.id) <= 0) {
      this.form.markAllAsTouched();
      this.message = 'Selecciona un empleado válido del catálogo y completa los datos.';
      return;
    }
    const value = this.form.getRawValue();
    const amount = Number(value.principal_amount);
    if (!Number.isFinite(amount) || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7 || value.reason.trim().length < 5) {
      this.message = 'El monto debe tener máximo dos decimales y el motivo al menos 5 caracteres útiles.';
      return;
    }
    this.saving = true;
    this.loans.createLoan({
      employee_id: Number(selected.id),
      requested_on: value.requested_on,
      principal_amount: amount,
      reason: value.reason.trim(),
    }).pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false))
      .subscribe({
        next: () => this.ref.close(true),
        error: (err) => { console.error('No se pudo registrar el préstamo', err); },
      });
  }
}
