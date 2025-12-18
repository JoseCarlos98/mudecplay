import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// UI compartido
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

// Servicios / interfaces de productos
import { ProductsService } from '../../services/products.service';
import {
  ProductResponseDto,
  CreateProduct,
  PatchProduct,
} from '../../interfaces/products-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // UI
    ModuleHeader,
    InputField,
    BtnsSection,
    // Material
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './product-modal.html',
  styleUrl: './product-modal.scss',
})
export class ProductModal implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly productsService = inject(ProductsService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProductModal>);
  readonly data = inject<ProductResponseDto | null>(MAT_DIALOG_DATA);

  // ==========================
  //  CONFIG HEADER
  // ==========================
  readonly headerConfig = HEADER_CONFIG;

  // ==========================
  //  FORM
  // ==========================
  form: FormGroup = this.fb.group({
    name: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    clave_prod_serv: this.fb.control<string | null>(null),
    no_identificacion: this.fb.control<string | null>(null),
  });

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        clave_prod_serv: this.data.clave_prod_serv ?? null,
        no_identificacion: this.data.no_identificacion ?? null,
      });
    }
  }

  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;

    this.productsService.create(formData).subscribe({
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

    this.productsService.update(this.data?.id!, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar gastos:', err),
    });
  }

  // ==========================
  //  ACCIONES FOOTER
  // ==========================
  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}
