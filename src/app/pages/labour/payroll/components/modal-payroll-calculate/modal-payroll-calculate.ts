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
import { PayrollPeriodDto } from '../../interfaces/payroll-interfaces';
import { PayrollService } from '../../services/payroll.service';

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

/** Fecha local YYYY-MM-DD: evita bloquear el sábado por UTC. */
function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-modal-payroll-calculate',
  standalone: true,
  imports: [CommonModule, MatIconModule, ModuleHeader, BtnsSection, LoadingOverlay],
  templateUrl: './modal-payroll-calculate.html',
  styleUrl: './modal-payroll-calculate.scss',
})
export class ModalPayrollCalculate {
  readonly data = inject<{ period: PayrollPeriodDto }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalPayrollCalculate>);
  private readonly service = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  get period(): PayrollPeriodDto { return this.data.period; }

  get futureWeek(): boolean {
    return this.period.week_end > localDate();
  }

  get canCalculate(): boolean {
    return !this.saving && this.period.status === 'open' && !this.futureWeek &&
      (this.auth.hasRole('NOMINA_EDITOR') || this.auth.hasRole('ADMIN_GENERAL'));
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.close();
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    if (action === 'cancel') this.close();
    if (action === 'save') this.calculate();
  }

  close(): void {
    if (!this.saving) this.dialogRef.close(false);
  }

  calculate(): void {
    if (!this.canCalculate) return;
    this.saving = true;
    this.service.calculatePeriod(String(this.period.id))
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: error => {
          console.error('No se pudo calcular el borrador de Nómina:', error);
          // El interceptor global presenta los errores del backend.
        },
      });
  }
}
