import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { TreasuryBankAccountTableRow } from '../../../../interfaces/treasury.interfaces';
import { BtnsSection } from '../../../../../../shared/ui/btns-section/btns-section';
import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { TreasuryService } from '../../../../services/treasury.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';


const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export type BankAccountStatusAction = 'activate' | 'deactivate';

export interface ModalBankAccountStatusData {
  mode: BankAccountStatusAction;
  bankAccount: TreasuryBankAccountTableRow;
}

@Component({
  selector: 'app-modal-bank-account-status',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    BtnsSection,
  ],
  templateUrl: './modal-bank-account-status.html',
  styleUrl: './modal-bank-account-status.scss',
})
export class ModalBankAccountStatus {
  readonly data = inject<ModalBankAccountStatusData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ModalBankAccountStatus>);
  private readonly treasuryService = inject(TreasuryService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  get bankAccount(): TreasuryBankAccountTableRow {
    return this.data.bankAccount;
  }

  get isDeactivateMode(): boolean {
    return this.data.mode === 'deactivate';
  }

  get title(): string {
    return this.isDeactivateMode
      ? 'Desactivar cuenta bancaria'
      : 'Reactivar cuenta bancaria';
  }

  get actionText(): string {
    return this.isDeactivateMode ? 'desactivar' : 'reactivar';
  }

  get statusText(): string {
    return this.bankAccount.is_active ? 'Activa' : 'Inactiva';
  }

  get companyName(): string {
    return this.bankAccount.company_name || 'Sin empresa';
  }

  get bankName(): string {
    return this.bankAccount.bank_name || 'Sin banco';
  }

  get accountIdentifier(): string {
    return this.bankAccount.account_identifier || 'Sin identificador';
  }

  get alias(): string {
    return this.bankAccount.alias_display || 'Sin alias';
  }

  get currency(): string {
    return this.bankAccount.currency || 'MXN';
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.saveStatusChange();
        break;

      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  private saveStatusChange(): void {
    if (this.saving || !this.bankAccount?.id) return;

    this.saving = true;

    const request$ = this.isDeactivateMode
      ? this.treasuryService.deactivateBankAccount(this.bankAccount.id)
      : this.treasuryService.updateBankAccount(this.bankAccount.id, {
          is_active: true,
        });

    request$
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          /**
           * Por seguridad:
           * - Si backend regresa { success: true }, cierra.
           * - Si backend regresa la entidad u otro objeto sin success, también cierra.
           * - Solo no cierra si success viene explícitamente en false.
           */
          if (response?.success !== false) {
            this.closeModal(true);
          }
        },
        error: (err) => {
          console.error(
            `Error al ${this.actionText} cuenta bancaria:`,
            err,
          );

          this.dialogService
            .confirm({
              title: 'Error',
              message: `No se pudo ${this.actionText} la cuenta bancaria.`,
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