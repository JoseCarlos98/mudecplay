import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader, ModuleHeaderConfig } from '../../../shared/ui/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Autocomplete } from '../../../shared/autocomplete/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { toApiDate } from '../../../shared/helpers/date-utils';
import { ExpenseService } from '../services/expense.service';
import { ExpenseResponseDto } from '../interfaces/expense-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete
  ],
  templateUrl: './expense-modal.html',
  styleUrl: './expense-modal.scss',
  providers: [provideNativeDateAdapter()],
})
export class ExpenseModal implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly data = inject<ExpenseResponseDto>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

  form: FormGroup = this.fb.group({
    concept: ['', Validators.required],
    date: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    supplier_id: [null],
    project_id: [1]
  })

  ngOnInit(): void {
    console.log(this.data);
    this.patchEditData()
  }

  patchEditData() {
    if (this.data?.id) {
      this.form.patchValue({
        concept: this.data.concept,
        date: this.data.date,
        amount: this.data.amount,
        supplier_id: this.data.supplier?.id ?? '',
        project_id: this.data.project?.id ?? ''
      });
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const formData = {
      ...raw,
      date: toApiDate(raw.date),
      project_id : 1
    };

    console.log('formData listo para enviar a backend:', formData);

    this.expenseService.create(formData).subscribe({
      next: (response) => (
        this.closeModal(true)
      ),
      error: (err) => console.error('Error al cargar gastos:', err)
    });
  }

  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}
