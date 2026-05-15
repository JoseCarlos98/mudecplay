import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private readonly productsService = inject(ProductsService);
  readonly data = inject<ProductResponseDto | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ProductModal>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  form = this.fb.group({
    name: this.fb.control<string | null>(null, {
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    clave_prod_serv: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(50)],
    }),
    no_identificacion: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(100)],
    }),
  });

  ngOnInit(): void {
    if (this.data?.id) {
      this.form.patchValue({
        name: this.data.name ?? null,
        clave_prod_serv: this.data.clave_prod_serv ?? null,
        no_identificacion: this.data.no_identificacion ?? null,
      });
    }
  }

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData: CreateProduct = {
      name: this.form.value.name?.trim() || '',
      clave_prod_serv: this.form.value.clave_prod_serv?.trim() || null,
      no_identificacion: this.form.value.no_identificacion?.trim() || null,
    };

    this.productsService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar producto:', err),
    });
  }

  updateData(): void {
    if (this.form.invalid || !this.data?.id) {
      this.form.markAllAsTouched();
      return;
    }

    const formData: PatchProduct = {
      name: this.form.value.name?.trim() || '',
      clave_prod_serv: this.form.value.clave_prod_serv?.trim() || null,
      no_identificacion: this.form.value.no_identificacion?.trim() || null,
    };

    this.productsService.update(this.data.id, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar producto:', err),
    });
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        if (this.data?.id) {
          this.updateData();
        } else {
          this.saveData();
        }
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}