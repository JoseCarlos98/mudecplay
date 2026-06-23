import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';
import { Autocomplete } from '../../../../../../shared/ui/autocomplete/autocomplete';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';

import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';
import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';
import { PendingTicketPhotoRow } from '../../../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-change-proyect',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    Autocomplete,
    BtnsSection,
    LoadingOverlay,

    MatIconModule,
  ],
  templateUrl: './change-proyect.html',
  styleUrl: './change-proyect.scss',
})
export class ChangeProyect {
  private readonly fb = inject(FormBuilder);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly dialogRef = inject(MatDialogRef<ChangeProyect>);

  readonly headerConfig = HEADER_CONFIG;
  readonly saving = signal(false);

  errorMessage: string | null = null;

  form = this.fb.group({
    project: this.fb.control<Catalog | number | string | null>(null),
  });

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: PendingTicketPhotoRow,
  ) {}

  get fileName(): string {
    return this.data?.file_name || 'Foto del ticket';
  }

  get currentProjectName(): string {
    return this.data?.project_name || 'Sin proyecto';
  }

  get uploadedByName(): string {
    return this.data?.uploaded_by_name || 'Sin dato';
  }

  get selectedProjectName(): string {
    const project = this.form.controls.project.value;

    if (!project) return 'Sin seleccionar';

    if (typeof project === 'object') {
      return project.name ?? 'Sin seleccionar';
    }

    return String(project);
  }

  get selectedProjectId(): number | null {
    return this.getCatalogId(this.form.controls.project.value);
  }

  get canSave(): boolean {
    const selectedProjectId = this.selectedProjectId;
    const currentProjectId = Number(this.data?.project_id ?? 0);

    return (
      !this.saving() &&
      !!this.data?.id &&
      !!selectedProjectId &&
      selectedProjectId !== currentProjectId
    );
  }

  onFooterAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'save':
        this.save();
        break;

      case 'cancel':
        this.close(false);
        break;

      default:
        break;
    }
  }

  save(): void {
    if (!this.canSave || !this.data?.id || !this.selectedProjectId) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.saving.set(true);

    this.purchaseOrdersService
      .updateTicketPhotoProject(this.data.id, {
        project_id: this.selectedProjectId,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.close(true);
        },
        error: (err) => {
          console.error('Error al cambiar proyecto de foto:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo cambiar el proyecto de la foto.';
        },
      });
  }

  close(result = false): void {
    this.dialogRef.close(result);
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