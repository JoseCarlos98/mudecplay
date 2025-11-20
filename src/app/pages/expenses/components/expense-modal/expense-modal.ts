import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toApiDate, toIdForm } from '../../../../shared/helpers/general-helpers';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseResponseDto, PatchExpense } from '../../interfaces/expense-interfaces';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete, InputField, BtnsSection, InputDate, BtnsSection],
  templateUrl: './expense-modal.html',
})
export class ExpenseModal implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  readonly data = inject<ExpenseResponseDto>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

form: FormGroup = this.fb.group({
  concept: ['', Validators.required],
  date: this.fb.control<string | null>(null, { validators: Validators.required }),
  amount: ['', Validators.required],
  supplier_id: [null],
  project_id: [null],
});

  ngOnInit(): void {
    console.log(this.data);
    this.patchEditData()
  }

  patchEditData() {
 
  }

  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const formData = {
      ...raw,
      supplier_id: toIdForm(raw.supplier_id),
      project_id: toIdForm(raw.project_id),
    };

    this.expenseService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar gastos:', err),
    });
  }

  updateData() {
    const raw = this.form.value;

    const formData: PatchExpense = {
      ...raw,
      date: toApiDate(raw.date),
      supplier_id: toIdForm(raw.supplier_id),
      project_id: toIdForm(raw.project_id),
    };

    this.expenseService.update(this.data.id, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar gastos:', err),
    });
  }

  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}
