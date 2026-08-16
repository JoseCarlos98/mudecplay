import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { DialogService } from '../../../../shared/services/dialog.service';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import * as entity from '../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-purchase-order-authorized',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    ModuleHeader,
    Autocomplete,
    BtnsSection,
  ],
  templateUrl: './modal-purchase-order-authorized.html',
  styleUrl: './modal-purchase-order-authorized.scss',
})
export class ModalPurchaseOrderAuthorized implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ModalPurchaseOrderAuthorized>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;

  loading = false;
  saving = false;
  saved = false;

  authorizers: entity.PurchaseOrderAuthorizerDto[] = [];

  form = this.fb.group({
    employee_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.loadAuthorizers();
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.saveData();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  saveData(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const employeeId = this.getCatalogId(raw.employee_id);

    if (!employeeId) {
      this.form.controls.employee_id.setErrors({
        required: true,
      });
      this.form.markAllAsTouched();
      return;
    }

    const payload: entity.CreatePurchaseOrderAuthorizerDto = {
      employee_id: employeeId,
    };

    this.saving = true;

    this.purchaseOrdersService
      .createPurchaseOrderAuthorizer(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.saved = true;

          if (response?.data) {
            this.authorizers = [...this.authorizers, response.data].sort(
              (a, b) =>
                (a.employee_name ?? '').localeCompare(b.employee_name ?? ''),
            );
          }

          this.form.reset({
            employee_id: null,
          });
        },
        error: (err) => {
          console.error('Error al guardar autorizador:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo agregar el autorizador.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  deactivateAuthorizer(row: entity.PurchaseOrderAuthorizerDto): void {
    if (!row?.id || this.saving) return;

    const name = row.employee_name || row.employee?.name || 'este autorizador';

    this.dialogService
      .confirm({
        title: 'Quitar autorizador',
        message: `¿Quieres quitar a ${name} del catálogo de autorizadores?`,
        confirmText: 'Sí, quitar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.saving = true;

        this.purchaseOrdersService
          .deactivatePurchaseOrderAuthorizer(row.id)
          .pipe(
            finalize(() => {
              this.saving = false;
            }),
          )
          .subscribe({
            next: () => {
              this.saved = true;
              this.authorizers = this.authorizers.filter(
                (item) => item.id !== row.id,
              );
            },
            error: (err) => {
              console.error('Error al desactivar autorizador:', err);

              this.dialogService
                .confirm({
                  title: 'Error',
                  message: 'No se pudo quitar el autorizador.',
                  confirmText: 'OK',
                  cancelText: '',
                })
                .subscribe();
            },
          });
      });
  }

  closeModal(): void {
    this.dialogRef.close(this.saved);
  }

  private loadAuthorizers(): void {
    if (this.loading) return;

    this.loading = true;

    this.purchaseOrdersService
      .getPurchaseOrderAuthorizers()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (rows) => {
          this.authorizers = rows ?? [];
        },
        error: (err) => {
          console.error('Error al cargar autorizadores:', err);
          this.authorizers = [];
        },
      });
  }

  private getCatalogId(value: Catalog | number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value.id);
    return Number.isFinite(parsed) ? parsed : null;
  }
}