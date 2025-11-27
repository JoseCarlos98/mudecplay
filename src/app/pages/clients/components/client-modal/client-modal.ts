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
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { ClientsService } from '../../services/clients.service';
import { ClientsResponseDto } from '../../interfaces/clients-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-client-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
    Autocomplete, InputField, BtnsSection, BtnsSection, InputSelect, MatSlideToggle],
  templateUrl: './client-modal.html',
  styleUrl: './client-modal.scss',
})
export class ClientModal {
 readonly data = inject<ClientsResponseDto>(MAT_DIALOG_DATA);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogRef = inject(MatDialogRef<ClientModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

  form: FormGroup = this.fb.group({
    name: this.fb.control<string | null>(null, { validators: Validators.required }),
    phone: this.fb.control<string | null>(null, { validators: Validators.required }),
    email: this.fb.control<string | null>(null, { validators: Validators.required }),
    will_invoice: this.fb.control<boolean>(false, { validators: Validators.required }),
    company_name: this.fb.control<string | null>(null),
    address: this.fb.control<string | null>(null),
    days_credit: this.fb.control<number | null>(null),
    contact_name: this.fb.control<string | null>(null),
    responsible_id: this.fb.control<Catalog | null>(null)
  });

  catalogArea: Catalog[] = [];

  ngOnInit() {
    console.log(this.data);
    this.loadCatalogs()

    if (this.data?.id) this.form.patchValue({ ...this.data });
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs() {
    this.catalogsService.areaSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogArea = response;
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
    });
  }

  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;

    this.clientsService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar gastos:', err),
    });
  }

  updateData() {
    const formData = this.form.value;

    this.clientsService.update(this.data.id, formData).subscribe({
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
