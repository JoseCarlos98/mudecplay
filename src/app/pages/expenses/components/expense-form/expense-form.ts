import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader, ModuleHeaderAction, ModuleHeaderConfig } from '../../../../shared/ui/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toApiDate, toCatalogLike, toIdForm } from '../../../../shared/helpers/general-helpers';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseResponseDto, PatchExpense } from '../../interfaces/expense-interfaces';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { ActivatedRoute, Router } from '@angular/router';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true
};

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete, InputField, BtnsSection, InputDate, BtnsSection],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm {
  route = inject(ActivatedRoute);
  private readonly expenseService = inject(ExpenseService);
  private readonly router = inject(Router);
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
    this.patchEditData()
  }

  patchEditData() {
    // if (this.data?.id) {
    //   this.form.patchValue({
    //     concept: this.data.concept,
    //     date: this.data.date,
    //     amount: this.data.amount,
    //     supplier_id: toCatalogLike(
    //       this.data.supplier?.id ?? null,
    //       this.data.supplier?.company_name ?? null
    //     ),
    //     project_id: toCatalogLike(
    //       this.data.project?.id ?? null,
    //       this.data.project?.name ?? null
    //     ),
    //   });
    // }
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
    console.log(formData);


    // this.expenseService.create(formData).subscribe({
    //   next: (response) => {
    //     if (response.success) {
    //       console.log('save');

    //     }
    //   },
    //   error: (err) => console.error('Error al guardar gastos:', err),
    // });
  }

  updateData() {
    // const raw = this.form.value;

    // const formData: PatchExpense = {
    //   ...raw,
    //   date: toApiDate(raw.date),
    //   supplier_id: toIdForm(raw.supplier_id),
    //   project_id: toIdForm(raw.project_id),
    // };

    // this.expenseService.update(this.data.id, formData).subscribe({
    //   next: (response) => {
    //     if (response.success) {
    //       console.log('update');

    //     }
    //   },
    //   error: (err) => console.error('Error al editar gastos:', err),
    // });
  }

  onHeaderAction(action: ModuleHeaderAction | string) {
    switch (action) {
      case 'back':
        this.router.navigateByUrl('/gastos'); 
        break;
    }
  }
}
