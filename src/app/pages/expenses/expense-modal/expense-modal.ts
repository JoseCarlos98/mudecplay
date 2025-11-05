import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader, ModuleHeaderConfig } from '../../../shared/ui/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { Autocomplete } from '../../../shared/autocomplete/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { toApiDate } from '../../../shared/helpers/date-utils';

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
export class ExpenseModal implements AfterViewInit, OnInit {
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);
  private readonly fb = inject(FormBuilder);
  private readonly catalogsService = inject(CatalogsService);
  readonly headerConfig = HEADER_CONFIG;

  form: FormGroup = this.fb.group({
    concept: ['', Validators.required],
    date: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    supplier_id: ['', Validators.required],
    project_id: ['', Validators.required]
  })

  ngOnInit(): void {
    if (this.data?.expense) {
      this.form.patchValue({
        concept: this.data.expense.concept,
        date: this.data.expense.date,
        amount: this.data.expense.amount,
        supplier_id: this.data.expense.supplier?.id ?? '',
        project_id: this.data.expense.project?.id ?? ''
      });
    }
  }

  ngAfterViewInit(): void {
    console.log('Data', this.data);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAsTouched()
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const payload = {
      ...raw,
      date: toApiDate(raw.date), 
    };

    console.log('Payload listo para enviar a backend:', payload);
  }

  closeModal() {
    this.dialogRef.close();
    this.form.patchValue(
      {
        "concept": "daeqw",
        "date": "2025-11-20",
        "amount": 282,
        "supplier_id": 1,
        "project_id": "df"
      }
    )
  }
}
