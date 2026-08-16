import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

import { WarehouseService } from '../../services/warehouse.service';
import * as entity from '../../interfaces/warehouse-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export type ModalWarehouseCancelData = {
  expenseId?: number;
  id?: number;
};

@Component({
  selector: 'app-modal-warehouse-cancel',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    LoadingOverlay,
  ],
  templateUrl: './modal-warehouse-cancel.html',
  styleUrl: './modal-warehouse-cancel.scss',
})
export class ModalWarehouseCancel implements OnInit {
  readonly data = inject<ModalWarehouseCancelData>(MAT_DIALOG_DATA);

  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogRef = inject(MatDialogRef<ModalWarehouseCancel>);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly preview = signal<entity.WarehouseCancelPreviewDto | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly expenseId = computed(() =>
    Number(this.data?.expenseId ?? this.data?.id ?? 0),
  );

  form = this.fb.group({
    reason: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
  });

  ngOnInit(): void {
    this.loadPreview();
  }

  get reasonCtrl() {
    return this.form.get('reason');
  }

  get hasProjectImpact(): boolean {
    return !!this.preview()?.summary?.has_project_impact;
  }

  get activeOutputsCount(): number {
    return Number(this.preview()?.summary?.active_outputs_count ?? 0);
  }

  get totalAmountToRemove(): number {
    return Number(
      this.preview()?.summary?.total_amount_to_remove_from_projects ?? 0,
    );
  }

  get lotsCount(): number {
    return Number(this.preview()?.summary?.lots_count ?? 0);
  }

  get impactTitle(): string {
    return this.hasProjectImpact
      ? 'Este gasto ya impactó proyectos'
      : 'Este gasto todavía no impacta proyectos';
  }

  get impactTotalLabel(): string {
    return this.hasProjectImpact
      ? 'Se retirará de proyectos'
      : 'Impacto en proyectos';
  }

  get beforeConfirmText(): string {
    if (this.hasProjectImpact) {
      return 'El gasto dejará de aparecer en el listado, el material dejará de estar disponible en almacén y las salidas activas se regresarán automáticamente para que dejen de impactar reportes.';
    }

    return 'El gasto dejará de aparecer en el listado y el material dejará de estar disponible en almacén. No se afectará ningún proyecto.';
  }

  loadPreview(): void {
    if (this.loading()) return;

    const id = this.expenseId();

    if (!id) {
      this.errorMessage.set('No se recibió el gasto a cancelar.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.warehouseService
      .getWarehouseCancelPreview(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.preview.set(response);
        },
        error: (err) => {
          console.error('Error al cargar preview de cancelación:', err);

          this.errorMessage.set(
            err?.error?.message ||
              'No se pudo cargar la información de cancelación.',
          );
        },
      });
  }

  saveData(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.expenseId();
    const reason = this.form.getRawValue().reason?.trim();

    if (!id || !reason) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    this.warehouseService
      .cancelWarehouseExpense(id, { reason })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            // No usar closeModal(true) aquí porque closeModal bloquea cuando saving() está en true.
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          console.error('Error al cancelar gasto de almacén:', err);

          this.errorMessage.set(
            err?.error?.message ||
              'No se pudo cancelar el gasto de almacén.',
          );
        },
      });
  }

  onBtnsSectionAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;

      case 'save':
        this.saveData();
        break;

      default:
        break;
    }
  }

  closeModal(saved = false): void {
    if (this.saving()) return;
    this.dialogRef.close(saved);
  }

  formatMoney(value: number | string | null | undefined): string {
    return Number(value ?? 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatQuantity(
    value: number | string | null | undefined,
    unit?: string | null,
  ): string {
    const quantity = Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    return `${quantity} ${unit ?? ''}`.trim();
  }

  getLotStatusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      available: 'Disponible',
      partial: 'Parcial',
      depleted: 'Agotado',
      cancelled: 'Cancelado',
    };

    return labels[String(status ?? '')] ?? String(status ?? '-');
  }

  getLotStatusClass(status: string | null | undefined): string {
    return `status-pill--${status ?? 'unknown'}`;
  }
}