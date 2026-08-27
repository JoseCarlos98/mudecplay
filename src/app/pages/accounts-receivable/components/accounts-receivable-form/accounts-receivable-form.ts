import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  MatIconModule,
} from '@angular/material/icon';


// =========================================================
// UI COMPARTIDA
// =========================================================

import {
  ModuleHeader,
} from '../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  InputField,
} from '../../../../shared/ui/input-field/input-field';

import {
  InputDate,
} from '../../../../shared/ui/input-date/input-date';

import {
  InputSelect,
} from '../../../../shared/ui/input-select/input-select';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';

import {
  Autocomplete,
} from '../../../../shared/ui/autocomplete/autocomplete';


// =========================================================
// SERVICIOS
// =========================================================

import {
  DialogService,
} from '../../../../shared/services/dialog.service';

import {
  AccountsReceivableService,
} from '../../services/accounts-receivable.service';


// =========================================================
// HELPERS / INTERFACES
// =========================================================

import {
  Catalog,
} from '../../../../shared/interfaces/general-interfaces';

import {
  toIdForm,
} from '../../../../shared/helpers/general-helpers';

import * as entity
  from '../../interfaces/accounts-receivable-interfaces';


// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    formFull: true,
  };


@Component({
  selector:
    'app-accounts-receivable-form',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    InputField,
    InputDate,
    InputSelect,
    BtnsSection,
    Autocomplete,

    MatIconModule,
  ],

  templateUrl:
    './accounts-receivable-form.html',

  styleUrl:
    './accounts-receivable-form.scss',
})
export class AccountsReceivableForm
  implements OnInit {

  // =======================================================
  // INYECCIONES
  // =======================================================

  private readonly activatedRoute =
    inject(
      ActivatedRoute,
    );

  private readonly accountsReceivableService =
    inject(
      AccountsReceivableService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly dialogService =
    inject(
      DialogService,
    );

  readonly router =
    inject(
      Router,
    );


  // =======================================================
  // UI
  // =======================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly companyOptions =
    entity
      .ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS;


  // =======================================================
  // XML
  // =======================================================

  isXmlImport =
    false;

  cfdiUuidFromXml:
    string | null =
    null;

  xmlQueueTotal =
    0;

  xmlQueuePending =
    0;


  // =======================================================
  // CxC
  // =======================================================

  accountReceivableId =
    0;


  // =======================================================
  // FORMULARIO
  // =======================================================

  form:
    FormGroup =
    this.fb.group({

      company_code:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      emitter_name:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      emitter_rfc:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      receiver_name:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      receiver_rfc:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      issue_date:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      series:
        this.fb.control<
          string | null
        >(
          null,
        ),

      folio:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      cfdi_uuid:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      subtotal:
        this.fb.control<
          number | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      total:
        this.fb.control<
          number | null
        >(
          null,
          {
            validators:
              Validators.required,
          },
        ),

      currency:
        this.fb.control<
          string | null
        >(
          'MXN',
          {
            validators:
              Validators.required,
          },
        ),

      source_file_name:
        this.fb.control<
          string | null
        >(
          null,
        ),

      project_id:
        this.fb.control<
          Catalog | null
        >(
          null,
        ),

      estimated_collection_date:
        this.fb.control<
          string | null
        >(
          null,
        ),
    });


  // =======================================================
  // CICLO DE VIDA
  // =======================================================

  ngOnInit(): void {

    const idParam =
      this.activatedRoute
        .snapshot
        .paramMap
        .get(
          'id',
        );

    if (idParam) {

      this.accountReceivableId =
        Number(
          idParam,
        );

      this.loadAccountReceivable(
        this.accountReceivableId,
      );

      return;
    }

    if (
      this.accountsReceivableService
        .hasMoreXmlDrafts()
    ) {

      this.loadNextXmlFromQueueOrExit();

      return;
    }

    this.navigateToList();
  }


  // =======================================================
  // BLOQUEO DE DATOS CFDI
  // =======================================================

  private applyReadonlyLocking():
    void {

    [
      'company_code',
      'emitter_name',
      'emitter_rfc',
      'receiver_name',
      'receiver_rfc',
      'issue_date',
      'series',
      'folio',
      'cfdi_uuid',
      'subtotal',
      'total',
      'currency',
      'source_file_name',
    ].forEach(
      (
        field,
      ) => {

        this.form
          .get(
            field,
          )
          ?.disable();
      },
    );
  }


  // =======================================================
  // CARGAR DETALLE
  // =======================================================

  loadAccountReceivable(
    id:
      number,
  ): void {

    this.accountsReceivableService
      .getById(
        id,
      )
      .subscribe({

        next: (
          response,
        ) => {

          this.isXmlImport =
            Boolean(
              response.cfdi_uuid,
            );

          this.cfdiUuidFromXml =
            response.cfdi_uuid ??
            null;

          this.form.patchValue(
            {
              company_code:
                response.company_code,

              emitter_name:
                response.emitter_name,

              emitter_rfc:
                response.emitter_rfc,

              receiver_name:
                response.receiver_name,

              receiver_rfc:
                response.receiver_rfc,

              issue_date:
                response.issue_date,

              series:
                response.series,

              folio:
                response.folio,

              cfdi_uuid:
                response.cfdi_uuid,

              subtotal:
                response.subtotal,

              total:
                response.total,

              currency:
                response.currency,

              source_file_name:
                response.source_file_name,

              project_id:
                response.project,

              estimated_collection_date:
                response
                  .estimated_collection_date,
            },
          );

          this.applyReadonlyLocking();
        },

        error: (
          error,
        ) => {

          console.error(
            'Error al cargar cuenta por cobrar:',
            error,
          );
        },
      });
  }


  // =======================================================
  // XML -> FORM
  // =======================================================

  patchFormFromXmlDraft(
    draft:
      entity.XmlAccountReceivableDraftDto,
  ): void {

    this.isXmlImport =
      true;

    this.cfdiUuidFromXml =
      draft.uuid;

    this.form.patchValue(
      {
        company_code:
          draft.companyCode,

        emitter_name:
          draft.emitterName,

        emitter_rfc:
          draft.emitterRfc,

        receiver_name:
          draft.receiverName,

        receiver_rfc:
          draft.receiverRfc,

        issue_date:
          draft.issueDate,

        series:
          draft.series,

        folio:
          draft.folio,

        cfdi_uuid:
          draft.uuid,

        subtotal:
          draft.subtotal,

        total:
          draft.total,

        currency:
          draft.currency,

        source_file_name:
          draft.sourceFileName,

        project_id:
          null,

        estimated_collection_date:
          null,
      },
    );

    this.applyReadonlyLocking();
  }


  // =======================================================
  // CREATE
  // =======================================================

  saveData(): void {

    if (
      this.form.invalid
    ) {

      this.form.markAllAsTouched();

      return;
    }

    const payload =
      this.buildCreatePayloadFromForm();

    this.accountsReceivableService
      .create(
        payload,
      )
      .subscribe({

        next: (
          response,
        ) => {

          if (
            !response.success
          ) {
            return;
          }

          if (
            this.isXmlImport &&
            this.accountsReceivableService
              .hasMoreXmlDrafts()
          ) {

            this.loadNextXmlFromQueueOrExit();

            return;
          }

          this.accountsReceivableService
            .clearXmlQueue();

          this.navigateToList();
        },

        error: (
          error,
        ) => {

          console.error(
            'Error al crear cuenta por cobrar:',
            error,
          );
        },
      });
  }


  // =======================================================
  // UPDATE
  // =======================================================

  updateData(): void {

    if (
      this.form.invalid
    ) {

      this.form.markAllAsTouched();

      return;
    }

    const payload =
      this.buildUpdatePayloadFromForm();

    this.accountsReceivableService
      .update(
        this.accountReceivableId,
        payload,
      )
      .subscribe({

        next: (
          response,
        ) => {

          if (
            response.success
          ) {

            this.navigateToList();
          }
        },

        error: (
          error,
        ) => {

          console.error(
            'Error al actualizar cuenta por cobrar:',
            error,
          );
        },
      });
  }


  // =======================================================
  // PAYLOAD CREATE
  // =======================================================

  private buildCreatePayloadFromForm():
    entity.CreateAccountReceivable {

    const raw =
      this.form
        .getRawValue();

    return {
      cfdi_uuid:
        raw.cfdi_uuid!,

      series:
        raw.series ??
        null,

      folio:
        raw.folio!,

      company_code:
        raw.company_code!,

      emitter_rfc:
        raw.emitter_rfc!,

      emitter_name:
        raw.emitter_name!,

      receiver_rfc:
        raw.receiver_rfc!,

      receiver_name:
        raw.receiver_name!,

      issue_date:
        raw.issue_date!,

      estimated_collection_date:
        raw
          .estimated_collection_date ??
        null,

      subtotal:
        Number(
          raw.subtotal ??
          0,
        ),

      total:
        Number(
          raw.total ??
          0,
        ),

      currency:
        raw.currency ??
        'MXN',

      source_file_name:
        raw.source_file_name ??
        null,

      project_id:
        toIdForm(
          raw.project_id,
        ),
    };
  }


  // =======================================================
  // PAYLOAD UPDATE
  // =======================================================

  private buildUpdatePayloadFromForm():
    entity.UpdateAccountReceivable {

    const raw =
      this.form
        .getRawValue();

    return {
      estimated_collection_date:
        raw
          .estimated_collection_date ??
        null,

      project_id:
        toIdForm(
          raw.project_id,
        ),
    };
  }


  // =======================================================
  // SIGUIENTE XML
  // =======================================================

  loadNextXmlFromQueueOrExit():
    void {

    const nextDraft =
      this.accountsReceivableService
        .consumeNextXmlDraft();

    if (!nextDraft) {

      this.accountsReceivableService
        .clearXmlQueue();

      this.isXmlImport =
        false;

      this.cfdiUuidFromXml =
        null;

      this.navigateToList();

      return;
    }

    this.form.reset(
      {
        company_code:
          null,

        emitter_name:
          null,

        emitter_rfc:
          null,

        receiver_name:
          null,

        receiver_rfc:
          null,

        issue_date:
          null,

        series:
          null,

        folio:
          null,

        cfdi_uuid:
          null,

        subtotal:
          null,

        total:
          null,

        currency:
          'MXN',

        source_file_name:
          null,

        project_id:
          null,

        estimated_collection_date:
          null,
      },
    );

    Object.keys(
      this.form.controls,
    ).forEach(
      (
        key,
      ) => {

        this.form
          .get(
            key,
          )
          ?.enable({
            emitEvent:
              false,
          });
      },
    );

    this.patchFormFromXmlDraft(
      nextDraft,
    );

    const status =
      this.accountsReceivableService
        .getXmlQueueStatus();

    this.xmlQueueTotal =
      status.total;

    this.xmlQueuePending =
      status.pending;
  }


  // =======================================================
  // SALIR DEL FLUJO XML
  // =======================================================

  confirmExitFromXmlFlow():
    void {

    const pendingText =
      this.xmlQueuePending >
      0
        ? `Tienes ${this.xmlQueuePending} factura(s) pendiente(s) por registrar.\n\n`
        : '';

    this.dialogService
      .confirm({
        size:
          'small',

        title:
          'Salir del registro desde XML',

        message:
          `${pendingText}` +
          'Si sales ahora, esta factura y las pendientes no se registrarán en cuentas por cobrar. ' +
          'Podrás volver a subir los XML cuando quieras.\n\n' +
          '¿Quieres salir de todos modos?',

        confirmText:
          'Salir sin guardar',

        cancelText:
          'Seguir capturando',
      })
      .subscribe(
        (
          confirmed,
        ) => {

          if (!confirmed) {
            return;
          }

          this.accountsReceivableService
            .clearXmlQueue();

          this.navigateToList();
        },
      );
  }


  // =======================================================
  // HEADER
  // =======================================================

  onHeaderAction(
    action:
      ModuleHeaderAction |
      string,
  ): void {

    switch (action) {

      case 'back':

        if (
          this.cfdiUuidFromXml &&
          this.router.url.includes(
            'nuevo',
          )
        ) {

          this.confirmExitFromXmlFlow();

        } else {

          this.navigateToList();
        }

        break;
    }
  }


  // =======================================================
  // FOOTER
  // =======================================================

  onFooterAction(
    action:
      ModuleFooterAction |
      string,
  ): void {

    switch (action) {

      case 'cancel':

        if (
          this.cfdiUuidFromXml &&
          this.router.url.includes(
            'nuevo',
          )
        ) {

          this.confirmExitFromXmlFlow();

        } else {

          this.navigateToList();
        }

        break;
    }
  }


  // =======================================================
  // NAVEGACIÓN
  // =======================================================

  private navigateToList():
    void {

    this.router.navigateByUrl(
      '/cuentas-por-cobrar',
    );
  }
}