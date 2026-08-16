import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  finalize,
} from 'rxjs';

// =========================================================
// UI COMPARTIDA
// =========================================================

import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../../../../shared/ui/input-select/input-select';

import {
  InputDate,
} from '../../../../../../shared/ui/input-date/input-date';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

// =========================================================
// INTERFACES Y HELPERS COMPARTIDOS
// =========================================================

import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

import {
  roundMoney,
  toApiDate,
  toIdForm,
} from '../../../../../../shared/helpers/general-helpers';

// =========================================================
// SERVICIOS COMPARTIDOS
// =========================================================

import {
  CatalogsService,
} from '../../../../../../shared/services/catalogs.service';

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

// =========================================================
// MÓDULO
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };

@Component({
  selector:
    'app-modal-cash-payment',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,
    InputDate,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-cash-payment.html',

  styleUrl:
    './modal-cash-payment.scss',
})
export class ModalCashPayment
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryApplyCashPaymentModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalCashPayment,
        | entity.TreasuryApplyCashPaymentResponse
        | null
      >,
    );

  private readonly accountsPayableService =
    inject(
      TreasuryAccountsPayableService,
    );

  private readonly catalogsService =
    inject(
      CatalogsService,
    );

  private readonly dialogService =
    inject(
      DialogService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly destroyRef =
    inject(
      DestroyRef,
    );

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly loadingCatalogs =
    signal(false);

  readonly saving =
    signal(false);

  companyOptions:
    Catalog[] = [];

  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      amount:
        this.fb.control<
          number | null
        >(
          this.pendingAmount,
          {
            validators: [
              Validators.required,
              Validators.min(0.01),
              Validators.max(
                this.pendingAmount,
              ),
            ],
          },
        ),

      payment_date:
        this.fb.control<
          Date | string | null
        >(
          toApiDate(
            new Date(),
          ),
          {
            validators: [
              Validators.required,
            ],
          },
        ),

      company_id:
        this.fb.control<
          | Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      reference:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.maxLength(
                180,
              ),
            ],
          },
        ),

      notes:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
              Validators.minLength(
                5,
              ),
              Validators.maxLength(
                1000,
              ),
            ],
          },
        ),
    });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadCompanies();

    this.form.controls
      .company_id
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          company:
            | Catalog
            | number
            | string
            | null,
        ) => {
          this.updateNotesValidators(
            company,
          );
        },
      );
  }

  // =========================================================
  // CONCEPTO
  // =========================================================

  get item():
    entity.TreasuryPendingExpenseItemTableRow {
    return this.data.item;
  }

  get pendingAmount(): number {
    return roundMoney(
      Number(
        this.data
          ?.item
          ?.pending_amount ??
        0,
      ),
    );
  }

  get paidAmount(): number {
    return roundMoney(
      Number(
        this.item
          .paid_amount ??
        0,
      ),
    );
  }

  get originalAmount(): number {
    return roundMoney(
      Number(
        this.item
          .amount ??
        0,
      ),
    );
  }

  get amountToPay(): number {
    return roundMoney(
      Number(
        this.form.controls
          .amount
          .value ??
        0,
      ),
    );
  }

  get pendingAfter(): number {
    return roundMoney(
      Math.max(
        this.pendingAmount -
        this.amountToPay,
        0,
      ),
    );
  }

  // =========================================================
  // DATOS PARA MOSTRAR
  // =========================================================

  get folioDisplay(): string {
    return (
      this.item
        .internal_folio ||
      'Sin folio'
    );
  }

  get supplierDisplay(): string {
    return (
      this.item
        .supplier_display_name ||
      this.item
        .supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.item
        .project_name ||
      this.item
        .project
        ?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.item
        .concept ||
      'Sin concepto'
    );
  }

  get companyWasIdentified(): boolean {
    const companyId =
      Number(
        toIdForm(
          this.form.controls
            .company_id
            .value,
        ) ??
        0,
      );

    return (
      Number.isInteger(
        companyId,
      ) &&
      companyId > 0
    );
  }

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  get canSave(): boolean {
    if (
      this.saving() ||
      this.form.invalid
    ) {
      return false;
    }

    if (
      !Number.isFinite(
        this.amountToPay,
      ) ||
      this.amountToPay <= 0 ||
      this.amountToPay >
      this.pendingAmount
    ) {
      return false;
    }

    const paymentDate =
      toApiDate(
        this.form.controls
          .payment_date
          .value,
      );

    if (!paymentDate) {
      return false;
    }

    return true;
  }

  private updateNotesValidators(
    company:
      | Catalog
      | number
      | string
      | null,
  ): void {
    const companyId =
      Number(
        toIdForm(
          company,
        ) ??
        0,
      );

    const hasCompany =
      Number.isInteger(
        companyId,
      ) &&
      companyId > 0;

    const notesControl =
      this.form.controls.notes;

    if (hasCompany) {
      notesControl.setValidators([
        Validators.maxLength(
          1000,
        ),
      ]);
    } else {
      notesControl.setValidators([
        Validators.required,
        Validators.minLength(
          5,
        ),
        Validators.maxLength(
          1000,
        ),
      ]);
    }

    notesControl
      .updateValueAndValidity({
        emitEvent: false,
      });
  }

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  private loadCompanies(): void {
    if (
      this.loadingCatalogs()
    ) {
      return;
    }

    this.loadingCatalogs.set(
      true,
    );

    this.catalogsService
      .treasuryCompaniesCatalog()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.loadingCatalogs.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          companies:
            Catalog[],
        ) => {
          this.companyOptions =
            companies ?? [];
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error cargando empresas para el pago en efectivo:',
            error,
          );
        },
      });
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  saveData(): void {
    if (
      !this.canSave
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    const value =
      this.form
        .getRawValue();

    const amount =
      roundMoney(
        Number(
          value.amount ??
          0,
        ),
      );

    const paymentDate =
      toApiDate(
        value.payment_date,
      );

    const companyId =
      Number(
        toIdForm(
          value.company_id,
        ) ??
        0,
      );

    const reference =
      value.reference
        .trim() ||
      null;

    const notes =
      value.notes
        .trim() ||
      null;

    if (
      !paymentDate ||
      amount <= 0 ||
      amount >
      this.pendingAmount
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    if (
      companyId <= 0 &&
      (
        !notes ||
        notes.length < 5
      )
    ) {
      this.form.controls
        .notes
        .markAsTouched();

      return;
    }

    const payload:
      entity.TreasuryApplyCashPaymentPayload = {
      expense_item_id:
        this.item
          .expense_item_id,

      amount,

      payment_date:
        paymentDate,

      company_id:
        companyId > 0
          ? companyId
          : null,

      reference,

      notes,
    };

    this.saving.set(
      true,
    );

    this.accountsPayableService
      .applyCashPayment(
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.saving.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryApplyCashPaymentResponse,
        ) => {
          if (
            !response.success
          ) {
            return;
          }

          /*
           * No mostramos diálogo de éxito.
           * El interceptor ya muestra el mensaje.
           *
           * Se devuelve la respuesta para que
           * Cuentas por pagar recargue sus tablas.
           */
          this.dialogRef.close(
            response,
          );
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error al registrar el pago en efectivo:',
            error,
          );

          this.showError(
            this.resolveErrorMessage(
              error,
            ),
          );
        },
      });
  }

  // =========================================================
  // ACCIONES DEL FOOTER
  // =========================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {
    switch (action) {
      case 'save':
        this.saveData();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(): void {
    if (
      this.saving()
    ) {
      return;
    }

    this.dialogRef.close(
      null,
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  private showError(
    message: string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo registrar el pago',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
  }

  private resolveErrorMessage(
    error: unknown,
  ): string {
    const httpError =
      error as {
        error?: {
          message?:
            | string
            | string[];
        };

        message?: string;
      };

    const backendMessage =
      httpError
        ?.error
        ?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage.join(
        ' ',
      );
    }

    if (
      typeof backendMessage ===
      'string' &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    if (
      typeof httpError
        ?.message ===
      'string' &&
      httpError
        .message
        .trim()
    ) {
      return httpError.message;
    }

    return 'No se pudo registrar el pago en efectivo. Revisa que el concepto todavía tenga saldo pendiente.';
  }
}