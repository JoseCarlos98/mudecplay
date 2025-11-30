import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { ResponsibleService } from '../../services/responsible.service';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-responsible-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete, InputField, BtnsSection, BtnsSection, MatSlideToggle],
  templateUrl: './responsible-modal.html',
  styleUrl: './responsible-modal.scss',
})
export class ResponsibleModal implements OnInit {
  private readonly supplierService = inject(ResponsibleService);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogRef = inject(MatDialogRef<ResponsibleModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

  form: FormGroup = this.fb.group({
    // responsible_id: this.fb.control<Catalog | null>(null, { validators: Validators.required }),
    // client_id: this.fb.control<Catalog | null>(null, { validators: Validators.required }),
    responsible_id: this.fb.control<Catalog | null>(null),
    client_id: this.fb.control<Catalog | null>(null),
    name: this.fb.control<string | null>(null, { validators: Validators.required }),
    last_name: this.fb.control<string | null>(null),
    phone: this.fb.control<string | null>(null, { validators: Validators.required }),
    email: this.fb.control<string | null>(null, { validators: Validators.required }),
    will_invoice: this.fb.control<boolean>(false, { validators: Validators.required }),
    location: this.fb.control<string | null>(null),
    days_credit: this.fb.control<number | null>(null),
    contact_name: this.fb.control<string | null>(null),
  });

  ngOnInit() {
    if (this.data?.id) this.form.patchValue(this.data);
  }

  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;

    this.supplierService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar gastos:', err),
    });
  }

  updateData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;

    this.supplierService.update(this.data.id, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar gastos:', err),
    });
  }

  // ==========================
  //  ACCIONES FOOTER-FILTROS
  // ==========================
  onBtnsSectionAction(action: string) {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}  