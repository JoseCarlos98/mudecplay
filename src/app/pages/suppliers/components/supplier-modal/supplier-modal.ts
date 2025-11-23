import { Component, inject, OnInit } from '@angular/core';
import { SupplierService } from '../../services/supplier.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SupplierResponseDto } from '../../interfaces/supplier-interfaces';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { CatalogsService } from '../../../../shared/services/catalogs.service';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-supplier-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete, InputField, BtnsSection, InputDate, BtnsSection, InputSelect, MatSlideToggle],
  templateUrl: './supplier-modal.html',
  styleUrl: './supplier-modal.scss',
})
export class SupplierModal implements OnInit {
  private readonly expenseService = inject(SupplierService);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  // readonly data = inject<SupplierResponseDto>(MAT_DIALOG_DATA);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogRef = inject(MatDialogRef<SupplierModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

  form: FormGroup = this.fb.group({
    name: this.fb.control<string | null>(null, { validators: Validators.required }),
    company_name: this.fb.control<string | null>(null),
    area_id: this.fb.control<number | null>(null, { validators: Validators.required }),
    phone: this.fb.control<string | null>(null, { validators: Validators.required }),
    email: this.fb.control<string | null>(null, {
      validators: [Validators.required, Validators.email]
    }),
    address: this.fb.control<string | null>(null),
    days_credit: this.fb.control<number | null>(null, {
      validators: [Validators.min(0)]
    }),
    contact_name: this.fb.control<string | null>(null),
    will_invoice: this.fb.control<boolean>(false),
  });



  catalogArea: Catalog[] = [];

  ngOnInit(): void {
    console.log(this.data);
    this.loadCatalogs()
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs(): void {
    this.catalogsService.areaSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogArea = response;
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
    });
  }

  patchEditData() {
    if (this.data?.id) {
      this.form.patchValue({
        // concept: this.data.concept,
        // date: this.data.date,
        // amount: this.data.amount,
        // supplier_id: toCatalogLike(
        //   this.data.supplier?.id ?? null,
        //   this.data.supplier?.company_name ?? null
        // ),
        // project_id: toCatalogLike(
        //   this.data.project?.id ?? null,
        //   this.data.project?.name ?? null
        // ),
      });
    }
  }

  saveData() {
    console.log(this.form.value);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const formData = {
      ...raw,
      // supplier_id: toIdForm(raw.supplier_id),
      // project_id: toIdForm(raw.project_id),
    };

    // this.expenseService.create(formData).subscribe({
    //   next: (response) => {
    //     if (response.success) this.closeModal(true);
    //   },
    //   error: (err) => console.error('Error al guardar gastos:', err),
    // });
  }

  updateData() {
    const raw = this.form.value;

    // const formData: PatchExpense = {
    //   ...raw,
    //   date: toApiDate(raw.date),
    //   supplier_id: toIdForm(raw.supplier_id),
    //   project_id: toIdForm(raw.project_id),
    // };

    // this.expenseService.update(this.data.id, formData).subscribe({
    //   next: (response) => {
    //     if (response.success) this.closeModal(true);
    //   },
    //   error: (err) => console.error('Error al editar gastos:', err),
    // });
  }

  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}
