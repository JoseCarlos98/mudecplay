import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize, take } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { AuthService } from '../../../../../auth/services/auth.service';
import { EmployeeCompensationDto } from '../../interfaces/compensations-interfaces';
import { CompensationsService } from '../../services/compensations.service';

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-compensation-approve',
  standalone: true,
  imports: [CommonModule, MatIconModule, ModuleHeader, BtnsSection, LoadingOverlay],
  templateUrl: './modal-compensation-approve.html',
  styleUrl: './modal-compensation-approve.scss',
})
export class ModalCompensationApprove {
  readonly data = inject<{ compensation: EmployeeCompensationDto }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalCompensationApprove>);
  private readonly service = inject(CompensationsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  // La aprobación no contiene nuevos datos; solo puede ejecutarse sobre un pendiente.
  get canApprove(): boolean {
    return !this.saving && this.data.compensation.status === 'pending' &&
      (this.auth.hasRole('NOMINA_EDITOR') || this.auth.hasRole('ADMIN_GENERAL'));
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.close();
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    if (action === 'cancel') this.close();
    if (action === 'save') this.approve();
  }

  close(): void {
    if (!this.saving) this.dialogRef.close(false);
  }

  approve(): void {
    if (!this.canApprove) return;
    this.saving = true;
    this.service.approveCompensation(String(this.data.compensation.id))
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => {}, // El interceptor existente muestra el error devuelto por NestJS.
      });
  }
}
