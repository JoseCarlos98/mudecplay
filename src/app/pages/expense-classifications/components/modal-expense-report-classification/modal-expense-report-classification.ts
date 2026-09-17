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
  InputField,
} from '../../../../shared/ui/input-field/input-field';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios compartidos
import {
  DialogService,
} from '../../../../shared/services/dialog.service';

// Helpers
import {
  normalizeTextOnBlur,
} from '../../../../shared/helpers/general-helpers';

// Módulo
import * as entity
  from '../../interfaces/expense-classifications.interfaces';

import {
  ExpenseClassificationsService,
} from '../../services/expense-classifications.service';


// =========================================================
// CONFIGURACIÓN
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
    'app-modal-expense-report-classification',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-expense-report-classification.html',

  styleUrl:
    './modal-expense-report-classification.scss',
})
export class ModalExpenseReportClassification {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.ExpenseReportClassificationModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalExpenseReportClassification
      >,
    );


  private readonly service =
    inject(
      ExpenseClassificationsService,
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


  readonly saving =
    signal(
      false,
    );


  // =========================================================
  // MODO
  // =========================================================

  get isCreateMode():
    boolean {

    return (
      this.data.mode ===
      'create'
    );
  }


  get modalTitle():
    string {

    return this.isCreateMode
      ? 'Nueva clasificación'
      : 'Editar clasificación';
  }


  get saveLabel():
    string {

    return this.isCreateMode
      ? 'Crear clasificación'
      : 'Guardar cambios';
  }


  get loadingText():
    string {

    return this.isCreateMode
      ? 'Creando clasificación...'
      : 'Actualizando clasificación...';
  }


  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      name:
        this.fb.control<string>(
          this.getInitialName(),
          {
            nonNullable: true,

            validators: [
              Validators.required,

              Validators.maxLength(
                120,
              ),
            ],
          },
        ),
    });


  // =========================================================
  // VALIDACIÓN
  // =========================================================

  get canSave():
    boolean {

    if (
      this.saving() ||
      this.form.invalid
    ) {
      return false;
    }


    const name =
      this.getNormalizedName();

    if (!name) {
      return false;
    }


    /*
     * Si estamos editando y el nombre
     * quedó exactamente igual,
     * no hacemos una llamada innecesaria.
     */
    if (
      !this.isCreateMode &&
      name ===
        this.getOriginalNormalizedName()
    ) {
      return false;
    }


    return true;
  }


  // =========================================================
  // GUARDAR
  // =========================================================

  saveData():
    void {

    if (
      this.saving() ||
      !this.canSave
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    const name =
      this.getNormalizedName();


    /*
     * Dejamos también normalizado
     * el valor visible del formulario.
     */
    this.form.controls.name
      .setValue(
        name,
        {
          emitEvent: false,
        },
      );


    if (
      this.isCreateMode
    ) {

      this.createClassification(
        name,
      );

      return;
    }


    this.updateClassification(
      name,
    );
  }


  // =========================================================
  // CREAR
  // =========================================================

  private createClassification(
    name:
      string,
  ): void {

    const payload:
      entity.CreateExpenseReportClassificationPayload = {
        name,
      };


    this.saving
      .set(
        true,
      );


    this.service
      .createClassification(
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
        next: (
          response,
        ) => {

          /*
           * Regresamos la clasificación creada
           * al componente principal.
           */
          this.dialogRef
            .close(
              response,
            );
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error creando clasificación de gasto:',
            error,
          );


          this.showError(
            this.resolveErrorMessage(
              error,
              'No fue posible crear la clasificación.',
            ),
          );
        },
      });
  }


  // =========================================================
  // EDITAR
  // =========================================================

  private updateClassification(
    name:
      string,
  ): void {

    const classificationId =
      this.data
        .classification
        ?.id;


    if (
      !classificationId
    ) {

      this.showError(
        'No se encontró la clasificación que se desea editar.',
      );

      return;
    }


    const payload:
      entity.UpdateExpenseReportClassificationPayload = {
        name,
      };


    this.saving
      .set(
        true,
      );


    this.service
      .updateClassification(
        classificationId,
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
        next: (
          response,
        ) => {

          this.dialogRef
            .close(
              response,
            );
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error actualizando clasificación de gasto:',
            error,
          );


          this.showError(
            this.resolveErrorMessage(
              error,
              'No fue posible actualizar la clasificación.',
            ),
          );
        },
      });
  }


  // =========================================================
  // BTN SECTION
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
  // MODAL
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


  // =========================================================
  // HELPERS
  // =========================================================

  private getInitialName():
    string {

    return (
      this.data
        .classification
        ?.name ??
      ''
    );
  }


  private getNormalizedName():
    string {

    return normalizeTextOnBlur(
      this.form.controls
        .name
        .value,
    );
  }


  private getOriginalNormalizedName():
    string {

    return normalizeTextOnBlur(
      this.data
        .classification
        ?.name ??
      '',
    );
  }


  private showError(
    message:
      string,
  ): void {

    this.dialogService
      .confirm({
        title:
          this.isCreateMode
            ? 'No se pudo crear la clasificación'
            : 'No se pudo actualizar la clasificación',

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

    fallback:
      string,
  ): string {

    const backendMessage =
      (
        error as {
          error?: {
            message?:
              | string
              | string[];
          };
        }
      )
        ?.error
        ?.message;


    if (
      Array.isArray(
        backendMessage,
      )
    ) {

      return backendMessage
        .join(
          '\n',
        );
    }


    if (
      typeof backendMessage ===
        'string' &&
      backendMessage.trim()
    ) {

      return backendMessage
        .trim();
    }


    return fallback;
  }
}