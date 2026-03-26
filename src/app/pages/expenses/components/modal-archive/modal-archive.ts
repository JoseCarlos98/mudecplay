import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { DialogService } from '../../../../shared/services/dialog.service';

import { ExpenseService } from '../../services/expense.service';
import { ExpenseResponseDto } from '../../interfaces/expense-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-archive',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    BtnsSection,
  ],
  templateUrl: './modal-archive.html',
  styleUrl: './modal-archive.scss',
})
export class ModalArchive {
  readonly data = inject<ExpenseResponseDto>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalArchive>);
  private readonly expenseService = inject(ExpenseService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  get supplierName(): string {
    return this.data?.supplier?.company_name || 'No asignado';
  }

  get expenseType(): string {
    return this.data?.cfdi_uuid ? 'CFDI' : 'Manual';
  }

  get statusName(): string {
    return this.data?.status?.name || 'Sin estatus';
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.archiveExpense();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  private archiveExpense(): void {
    if (this.saving) return;

    this.saving = true;

    this.expenseService
      .archive(this.data.id)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal(true);
          }
        },
        error: (err) => {
          console.error('Error al archivar gasto:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo archivar el gasto.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}