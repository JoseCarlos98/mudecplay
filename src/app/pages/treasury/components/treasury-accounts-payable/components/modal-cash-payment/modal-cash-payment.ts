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
      entity.TreasuryCashPaymentModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalCashPayment,
        | entity.TreasuryApplyCashPaymentResponse
        | entity.TreasuryBulkApplyCashPaymentsResponse
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
  // DATOS DEL MODO
  // =========================================================

  get isBulk(): boolean {
    return (
      this.data.mode ===
      'bulk'
    );
  }

  private get singleItem():
    entity.TreasuryPendingExpenseItemTableRow
    | null {
    return this.data.mode ===
      'bulk'
      ? null
      : this.data.item;
  }

  get bulkExpenseItems():
    entity.TreasuryPendingExpenseItemTableRow[] {
    return this.data.mode ===
      'bulk'
      ? this.data.expense_items
      : [];
  }

  get bulkHistoricalPayments():
    entity.TreasuryHistoricalPaymentTableRow[] {
    return this.data.mode ===
      'bulk'
      ? this.data.historical_payments
      : [];
  }

  get bulkSelectedCount(): number {
    return (
      this.bulkExpenseItems.length +
      this.bulkHistoricalPayments.length
    );
  }

  get bulkCurrentAmount(): number {
    const total =
      this.bulkExpenseItems.reduce(
        (
          sum,
          row,
        ) =>
          sum +
          Number(
            row.pending_amount ??
            0,
          ),
        0,
      );

    return roundMoney(
      total,
    );
  }

  get bulkHistoricalAmount(): number {
    const total =
      this.bulkHistoricalPayments.reduce(
        (
          sum,
          row,
        ) =>
          sum +
          Number(
            row.amount ??
            0,
          ),
        0,
      );

    return roundMoney(
      total,
    );
  }

  // =========================================================
  // TEXTOS UI
  // =========================================================

  get modalTitle(): string {
    return this.isBulk
      ? 'Registrar efectivo masivo'
      : 'Registrar pago en efectivo';
  }

  get saveLabel(): string {
    return this.isBulk
      ? 'Registrar seleccionados'
      : 'Registrar pago';
  }

  get amountLabel(): string {
    return this.isBulk
      ? 'Total en efectivo'
      : 'Importe pagado';
  }

  get paymentDateLabel(): string {
    return this.isBulk
      ? 'Fecha para conceptos actuales'
      : 'Fecha del pago';
  }

  get notesLabel(): string {
    return this.isBulk
      ? 'Motivo / descripción común'
      : 'Notas';
  }

  get loadingText(): string {
    if (
      this.saving()
    ) {
      return this.isBulk
        ? 'Registrando pagos en efectivo...'
        : 'Registrando pago en efectivo...';
    }

    return 'Cargando información...';
  }

  // =========================================================
  // DATOS PARA MOSTRAR
  // =========================================================

  get pendingAmount(): number {
    if (
      this.isBulk
    ) {
      return roundMoney(
        this.bulkCurrentAmount +
        this.bulkHistoricalAmount,
      );
    }

    return roundMoney(
      Number(
        this.singleItem
          ?.pending_amount ??
        0,
      ),
    );
  }

  get paidAmount(): number {
    if (
      this.isBulk
    ) {
      return 0;
    }

    return roundMoney(
      Number(
        this.singleItem
          ?.paid_amount ??
        0,
      ),
    );
  }

  get originalAmount(): number {
    if (
      this.isBulk
    ) {
      return this.pendingAmount;
    }

    return roundMoney(
      Number(
        this.singleItem
          ?.amount ??
        0,
      ),
    );
  }

  get folioDisplay(): string {
    if (
      this.isBulk
    ) {
      return (
        `${this.bulkSelectedCount} ` +
        (
          this.bulkSelectedCount ===
          1
            ? 'registro seleccionado'
            : 'registros seleccionados'
        )
      );
    }

    return (
      this.singleItem
        ?.internal_folio ||
      'Sin folio'
    );
  }

  get supplierDisplay(): string {
    return (
      this.singleItem
        ?.supplier_display_name ||
      this.singleItem
        ?.supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.singleItem
        ?.project_name ||
      this.singleItem
        ?.project
        ?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.singleItem
        ?.concept ||
      'Sin concepto'
    );
  }

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

              Validators.min(
                0.01,
              ),

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
            nonNullable:
              true,

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
            nonNullable:
              true,

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

    if (
      this.isBulk
    ) {
      /*
       * El backend determina nuevamente los saldos
       * dentro de la transacción.
       *
       * En frontend mostramos el total conocido
       * y evitamos modificarlo manualmente.
       */
      this.form.controls
        .amount
        .setValue(
          this.pendingAmount,
          {
            emitEvent:
              false,
          },
        );

      this.form.controls
        .amount
        .disable({
          emitEvent:
            false,
        });

      /*
       * Los pagos históricos ya tienen
       * su propia fecha de pago.
       *
       * Si no hay conceptos actuales,
       * no necesitamos capturar una nueva fecha.
       */
      if (
        this.bulkExpenseItems.length ===
        0
      ) {
        this.form.controls
          .payment_date
          .setValue(
            null,
            {
              emitEvent:
                false,
            },
          );

        this.form.controls
          .payment_date
          .clearValidators();

        this.form.controls
          .payment_date
          .disable({
            emitEvent:
              false,
          });
      }
    }

    /*
     * Aplica las reglas correctas desde
     * el primer render del modal.
     */
    this.updateNotesValidators(
      this.form.controls
        .company_id
        .value,
    );

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
  // IMPORTES
  // =========================================================

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
    if (
      this.isBulk
    ) {
      return 0;
    }

    return roundMoney(
      Math.max(
        this.pendingAmount -
        this.amountToPay,
        0,
      ),
    );
  }

  // =========================================================
  // EMPRESA
  // =========================================================

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

    // =====================================================
    // BULK
    // =====================================================

    if (
      this.isBulk
    ) {
      if (
        this.bulkSelectedCount <=
          0 ||
        this.bulkSelectedCount >
          200
      ) {
        return false;
      }

      const notes =
        this.form.controls
          .notes
          .value
          .trim();

      if (
        notes.length <
          5 ||
        notes.length >
          500
      ) {
        return false;
      }

      /*
       * Solo los conceptos actuales
       * requieren una nueva fecha.
       */
      if (
        this.bulkExpenseItems.length >
        0
      ) {
        const paymentDate =
          toApiDate(
            this.form.controls
              .payment_date
              .value,
          );

        if (
          !paymentDate
        ) {
          return false;
        }
      }

      return true;
    }

    // =====================================================
    // INDIVIDUAL
    // =====================================================

    if (
      !this.singleItem
    ) {
      return false;
    }

    if (
      !Number.isFinite(
        this.amountToPay,
      ) ||
      this.amountToPay <=
        0 ||
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

    return Boolean(
      paymentDate,
    );
  }

  private updateNotesValidators(
    company:
      | Catalog
      | number
      | string
      | null,
  ): void {
    const notesControl =
      this.form.controls
        .notes;

    /*
     * En efectivo masivo el motivo
     * siempre es obligatorio porque
     * se aplicará a todo el lote.
     */
    if (
      this.isBulk
    ) {
      notesControl
        .setValidators([
          Validators.required,

          Validators.minLength(
            5,
          ),

          Validators.maxLength(
            500,
          ),
        ]);

      notesControl
        .updateValueAndValidity({
          emitEvent:
            false,
        });

      return;
    }

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
      companyId >
        0;

    /*
     * Flujo individual existente:
     *
     * con empresa identificada
     * → notas opcionales.
     *
     * sin empresa
     * → motivo obligatorio.
     */
    if (
      hasCompany
    ) {
      notesControl
        .setValidators([
          Validators.maxLength(
            1000,
          ),
        ]);
    } else {
      notesControl
        .setValidators([
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
        emitEvent:
          false,
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

    if (
      this.isBulk
    ) {
      this.saveBulkCash();

      return;
    }

    this.saveSingleCash();
  }

  // =========================================================
  // EFECTIVO INDIVIDUAL
  // =========================================================

  private saveSingleCash(): void {
    const item =
      this.singleItem;

    if (
      !item
    ) {
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
      amount <=
        0 ||
      amount >
        this.pendingAmount
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    if (
      companyId <=
        0 &&
      (
        !notes ||
        notes.length <
          5
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
        item.expense_item_id,

      amount,

      payment_date:
        paymentDate,

      company_id:
        companyId >
          0
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
           * El interceptor muestra el mensaje backend.
           * Solo devolvemos el resultado a la tabla.
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
  // EFECTIVO MASIVO
  // =========================================================

  private saveBulkCash(): void {
    const value =
      this.form
        .getRawValue();

    const companyId =
      Number(
        toIdForm(
          value.company_id,
        ) ??
        0,
      );

    /*
     * Solo aplica a conceptos actuales.
     * Los históricos mantienen su payment_date.
     */
    const paymentDate =
      this.bulkExpenseItems.length >
        0
        ? toApiDate(
            value.payment_date,
          )
        : null;

    const reference =
      value.reference
        .trim() ||
      null;

    const reason =
      value.notes
        .trim();

    if (
      reason.length <
        5 ||
      reason.length >
        500
    ) {
      this.form.controls
        .notes
        .markAsTouched();

      return;
    }

    if (
      this.bulkExpenseItems.length >
        0 &&
      !paymentDate
    ) {
      this.form.controls
        .payment_date
        .markAsTouched();

      return;
    }

    const historicalPaymentIds =
      this.bulkHistoricalPayments
        .map(
          (
            row,
          ) =>
            String(
              row.payment_id,
            ),
        );

    const expenseItemIds =
      this.bulkExpenseItems
        .map(
          (
            row,
          ) =>
            Number(
              row.expense_item_id,
            ),
        );

    if (
      historicalPaymentIds.length +
      expenseItemIds.length !==
      this.bulkSelectedCount
    ) {
      return;
    }

    const payload:
      entity.TreasuryBulkApplyCashPaymentsPayload = {
      historical_payment_ids:
        historicalPaymentIds,

      expense_item_ids:
        expenseItemIds,

      company_id:
        companyId >
          0
          ? companyId
          : null,

      payment_date:
        paymentDate,

      reference,

      reason,
    };

    this.saving.set(
      true,
    );

    this.accountsPayableService
      .bulkApplyCashPayments(
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
            entity.TreasuryBulkApplyCashPaymentsResponse,
        ) => {
          if (
            !response.success
          ) {
            return;
          }

          /*
           * Sin diálogo adicional.
           * El interceptor global presenta
           * el mensaje retornado por backend.
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
            'Error registrando efectivo masivo:',
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
    switch (
      action
    ) {
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
    message:
      string,
  ): void {
    this.dialogService
      .confirm({
        title:
          this.isBulk
            ? 'No se pudieron registrar los pagos'
            : 'No se pudo registrar el pago',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
  }

  private resolveErrorMessage(
    error:
      unknown,
  ): string {
    const httpError =
      error as {
        error?: {
          message?:
            | string
            | string[];
        };

        message?:
          string;
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

    return this.isBulk
      ? 'No fue posible procesar la selección en efectivo. Alguno de los registros pudo cambiar mientras realizabas la operación.'
      : 'No se pudo registrar el pago en efectivo. Revisa que el concepto todavía tenga saldo pendiente.';
  }
}