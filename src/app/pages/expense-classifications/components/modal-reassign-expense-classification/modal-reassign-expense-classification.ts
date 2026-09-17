import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  DestroyRef,
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

// UI compartida
import {
  ModuleHeader,
} from '../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';

import {
  InputSelect,
} from '../../../../shared/ui/input-select/input-select';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

// Interfaces compartidas
import {
  Catalog,
} from '../../../../shared/interfaces/general-interfaces';

// Helpers
import {
  toIdForm,
} from '../../../../shared/helpers/general-helpers';

// Módulo
import * as entity
  from '../../interfaces/expense-classifications.interfaces';

import {
  ExpenseClassificationsService,
} from '../../services/expense-classifications.service';


// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };


// =========================================================
// COMPONENTE
// =========================================================

@Component({
  selector:
    'app-modal-reassign-expense-classification',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputSelect,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-reassign-expense-classification.html',

  styleUrl:
    './modal-reassign-expense-classification.scss',
})
export class ModalReassignExpenseClassification {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.ReassignExpenseClassificationModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReassignExpenseClassification
      >,
    );


  private readonly service =
    inject(
      ExpenseClassificationsService,
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


  readonly saving =
    signal(
      false,
    );


  // =========================================================
  // DATOS
  // =========================================================

  get mapping():
    entity.ExpenseClassificationMapping {

    return this.data.mapping;
  }


  readonly classificationOptions:
    Catalog[] =
    this.data
      .classifications
      .filter(
        (
          classification,
        ) =>
          classification.isActive &&
          classification.id !==
            this.data.mapping
              .classification.id,
      )
      .map(
        (
          classification,
        ) => ({
          id:
            String(
              classification.id,
            ),

          name:
            classification.name,
        }),
      );


  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      classificationId:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
          {
            validators: [
              Validators.required,
            ],
          },
        ),
    });


  // =========================================================
  // INFORMACIÓN
  // =========================================================

  get sourceTypeLabel():
    string {

    return this.mapping
      .sourceType ===
      'concept'
      ? 'Concepto'
      : 'Producto histórico';
  }


  get canSave():
    boolean {

    if (
      this.saving() ||
      this.form.invalid
    ) {
      return false;
    }


    const classificationId =
      toIdForm(
        this.form
          .getRawValue()
          .classificationId,
      );


    return (
      Boolean(
        classificationId,
      ) &&
      classificationId !==
        this.mapping
          .classification
          .id
    );
  }


  // =========================================================
  // GUARDAR
  // =========================================================

  saveData():
    void {

    if (
      !this.canSave
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    const classificationId =
      toIdForm(
        this.form
          .getRawValue()
          .classificationId,
      );


    if (
      !classificationId
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    const payload:
      entity.ReassignExpenseClassificationPayload = {

      sourceType:
        this.mapping.sourceType,

      mappingId:
        this.mapping.mappingId,

      classificationId,
    };


    this.saving
      .set(
        true,
      );


    this.service
      .reassignMapping(
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(
          () =>
            this.saving
              .set(
                false,
              ),
        ),
      )
      .subscribe({
        next: () => {

          /*
           * El interceptor global
           * puede mostrar el mensaje del backend.
           *
           * Al padre solo le interesa saber
           * que debe refrescar la tabla.
           */
          this.dialogRef
            .close(
              true,
            );
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error reasignando homologación:',
            error,
          );
        },
      });
  }


  // =========================================================
  // FOOTER
  // =========================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {

    switch (
      action
    ) {

      case 'cancel':

        this.closeModal();

        break;

      default:
        break;
    }
  }


  // =========================================================
  // CERRAR
  // =========================================================

  closeModal():
    void {

    if (
      this.saving()
    ) {
      return;
    }


    this.dialogRef
      .close(
        null,
      );
  }
}