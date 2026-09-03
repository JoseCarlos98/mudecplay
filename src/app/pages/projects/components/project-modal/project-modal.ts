import {
  Component,
  inject,
  OnInit,
} from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CommonModule } from '@angular/common';

import {
  concatMap,
  finalize,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';


// Angular Material
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggle } from '@angular/material/slide-toggle';


// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';

import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';


// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/project-interfaces';


// Servicios
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { ProjectService } from '../../services/projects.service';


// Helpers
import { toIdForm } from '../../../../shared/helpers/general-helpers';


const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};


@Component({
  selector: 'app-project-modal',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDatepickerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggle,

    ModuleHeader,
    Autocomplete,
    InputField,
    InputDate,
    BtnsSection,
    InputSelect,
  ],

  templateUrl: './project-modal.html',
  styleUrl: './project-modal.scss',
})
export class ProjectModal implements OnInit {

  // ======================================================
  // INYECCIONES
  // ======================================================

  private readonly projectService =
    inject(ProjectService);

  readonly data =
    inject<entity.ProjectResponseDto | null>(
      MAT_DIALOG_DATA,
    );

  private readonly catalogsService =
    inject(CatalogsService);

  private readonly dialogRef =
    inject(MatDialogRef<ProjectModal>);

  private readonly fb =
    inject(FormBuilder);


  // ======================================================
  // CONFIG UI
  // ======================================================

  readonly headerConfig = HEADER_CONFIG;

  catalogArea: Catalog[] = [];


  // ======================================================
  // ESTADO
  // ======================================================

  savingProject = false;

  loadingCashCollections = false;

  savingCashCollection = false;


  /**
   * Se utiliza únicamente durante la creación.
   *
   * Si el proyecto sí se creó pero uno de los cobros
   * falla, conservamos su id para que al volver a
   * presionar Guardar NO creemos otro proyecto.
   */
  private createdProjectId: number | null = null;


  // ======================================================
  // COBROS GUARDADOS
  // ======================================================

  cashCollections:
    entity.ProjectCashCollection[] = [];

  cashCollectionsTotal = 0;


  // ======================================================
  // COBROS TEMPORALES
  //
  // Solo existen mientras estamos creando un proyecto.
  // ======================================================

  pendingCashCollections:
    entity.CreateProjectCashCollection[] = [];


  // ======================================================
  // FORM PRINCIPAL
  // ======================================================

  form: FormGroup = this.fb.group({

    responsible_id:
      this.fb.control<Catalog | null>(
        null,
      ),

    client_id:
      this.fb.control<Catalog | null>(
        null,
      ),

    area_id:
      this.fb.control<number | null>(
        null,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    name:
      this.fb.control<string | null>(
        null,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    phone:
      this.fb.control<string | null>(
        null,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    email:
      this.fb.control<string | null>(
        null,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    will_invoice:
      this.fb.control<boolean>(
        false,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    statusProject:
      this.fb.control<boolean>(
        false,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

    location:
      this.fb.control<string | null>(
        null,
      ),

    days_credit:
      this.fb.control<number | null>(
        null,
      ),

    contact_name:
      this.fb.control<string | null>(
        null,
      ),

    charge_amount:
      this.fb.control<string | null>(
        null,
        {
          validators: [
            Validators.required,
          ],
        },
      ),

  });


  // ======================================================
  // FORM COBRO EN EFECTIVO
  // ======================================================

  cashCollectionForm =
    this.fb.group({

      amount:
        this.fb.control<number | null>(
          null,
          {
            validators: [
              Validators.required,
              Validators.min(0.01),
            ],
          },
        ),

      received_date:
        this.fb.control<string | null>(
          null,
          {
            validators: [
              Validators.required,
            ],
          },
        ),

      notes:
        this.fb.control<string>(
          '',
        ),

    });


  // ======================================================
  // INIT
  // ======================================================

  ngOnInit(): void {

    this.loadCatalogs();


    // ==============================
    // EDITAR
    // ==============================

    if (this.data?.id) {

      this.form.patchValue({

        ...this.data,

        responsible_id:
          this.data.responsible ?? null,

        client_id:
          this.data.client ?? null,

        area_id:
          this.data.area?.id ?? null,

      });


      this.loadCashCollections();

    }

  }


  // ======================================================
  // CATÁLOGOS
  // ======================================================

  loadCatalogs(): void {

    this.catalogsService
      .areasSuppliersCatalog()
      .subscribe({

        next: (
          response: Catalog[],
        ) => {

          this.catalogArea =
            response;

        },

        error: (err) => {

          console.error(
            'Error al cargar áreas:',
            err,
          );

        },

      });

  }


  // ======================================================
  // TOTAL COBROS TEMPORALES
  // ======================================================

  get pendingCashCollectionsTotal(): number {

    const total =
      this.pendingCashCollections
        .reduce(
          (
            sum,
            item,
          ) =>
            sum +
            Number(
              item.amount ?? 0,
            ),
          0,
        );


    return Number(
      total.toFixed(2),
    );

  }


  // ======================================================
  // TOTAL QUE MOSTRAMOS
  // ======================================================

  get displayedCashTotal(): number {

    if (this.data?.id) {

      return this.cashCollectionsTotal;

    }


    return this.pendingCashCollectionsTotal;

  }


  // ======================================================
  // CANTIDAD DE MOVIMIENTOS
  // ======================================================

  get displayedCashCount(): number {

    if (this.data?.id) {

      return this.cashCollections.length;

    }


    return this.pendingCashCollections.length;

  }


  // ======================================================
  // HISTORIAL COBROS
  // ======================================================

  loadCashCollections(): void {

    if (
      !this.data?.id ||
      this.loadingCashCollections
    ) {

      return;

    }


    this.loadingCashCollections =
      true;


    this.projectService
      .getCashCollections(
        this.data.id,
      )
      .pipe(

        finalize(() => {

          this.loadingCashCollections =
            false;

        }),

      )
      .subscribe({

        next: (response) => {

          this.cashCollections =
            response.data ?? [];


          this.cashCollectionsTotal =
            Number(
              response.total_amount ?? 0,
            );

        },

        error: (err) => {

          console.error(
            'Error al cargar cobros en efectivo:',
            err,
          );

        },

      });

  }


  // ======================================================
  // AGREGAR COBRO
  // ======================================================

  saveCashCollection(): void {

    if (
      this.cashCollectionForm.invalid ||
      this.savingCashCollection ||
      this.savingProject
    ) {

      this.cashCollectionForm
        .markAllAsTouched();

      return;

    }


    const value =
      this.cashCollectionForm
        .getRawValue();


    const payload:
      entity.CreateProjectCashCollection = {

      amount:
        Number(
          value.amount,
        ),

      received_date:
        value.received_date!,

      notes:
        value.notes?.trim() || null,

    };


    // ====================================================
    // NUEVO PROYECTO
    //
    // Todavía no hay project_id.
    // Guardamos temporalmente en frontend.
    // ====================================================

    if (!this.data?.id) {

      this.pendingCashCollections.push({
        ...payload,
      });


      this.resetCashCollectionForm();

      return;

    }


    // ====================================================
    // EDITAR PROYECTO
    //
    // Ya tenemos project_id.
    // Guardamos directamente en backend.
    // ====================================================

    this.savingCashCollection =
      true;


    this.projectService
      .createCashCollection(
        this.data.id,
        payload,
      )
      .pipe(

        finalize(() => {

          this.savingCashCollection =
            false;

        }),

      )
      .subscribe({

        next: () => {

          this.resetCashCollectionForm();

          this.loadCashCollections();

        },

        error: (err) => {

          console.error(
            'Error al registrar cobro en efectivo:',
            err,
          );

        },

      });

  }


  // ======================================================
  // QUITAR COBRO TEMPORAL
  // ======================================================

  removePendingCashCollection(
    index: number,
  ): void {

    if (
      this.data?.id ||
      this.savingProject
    ) {

      return;

    }


    this.pendingCashCollections
      .splice(
        index,
        1,
      );

  }


  // ======================================================
  // RESET FORM COBRO
  // ======================================================

  private resetCashCollectionForm(): void {

    this.cashCollectionForm
      .reset({

        amount: null,

        received_date: null,

        notes: '',

      });

  }


  // ======================================================
  // CREAR PROYECTO
  // ======================================================

  saveData(): void {

    if (
      this.form.invalid ||
      this.savingProject ||
      this.savingCashCollection
    ) {

      this.form.markAllAsTouched();

      return;

    }


    this.savingProject =
      true;


    /**
     * Si createdProjectId ya existe significa:
     *
     * - el proyecto sí fue creado,
     * - algún cobro posterior falló,
     * - estamos reintentando solamente los cobros.
     */

    const projectId$:
      Observable<number> =
      this.createdProjectId

        ? of(
            this.createdProjectId,
          )

        : this.projectService
            .create(
              this.buildCreatePayload(),
            )
            .pipe(

              map(
                (response) => {

                  if (
                    !response.success ||
                    !response.id
                  ) {

                    throw new Error(
                      'El backend no devolvió el id del proyecto creado.',
                    );

                  }


                  this.createdProjectId =
                    response.id;


                  return response.id;

                },
              ),

            );


    projectId$
      .pipe(

        switchMap(
          (projectId) =>

            this.persistPendingCashCollections(
              projectId,
            ),
        ),

        finalize(() => {

          this.savingProject =
            false;

        }),

      )
      .subscribe({

        next: () => {

          this.closeModal(true);

        },

        error: (err) => {

          console.error(
            'Error al guardar proyecto o cobros en efectivo:',
            err,
          );

        },

      });

  }


  // ======================================================
  // PAYLOAD CREATE
  // ======================================================

  private buildCreatePayload():
    entity.CreateProject {

    const raw =
      this.form.getRawValue();


    return {

      name:
        String(
          raw.name ?? '',
        ).trim(),

      client_id:
        toIdForm(
          raw.client_id,
        ),

      responsible_id:
        toIdForm(
          raw.responsible_id,
        ),

      area_id:
        raw.area_id !== null &&
        raw.area_id !== undefined

          ? Number(
              raw.area_id,
            )

          : null,

      phone:
        String(
          raw.phone ?? '',
        ).trim(),

      email:
        String(
          raw.email ?? '',
        ).trim(),

      location:
        raw.location?.trim() ||
        null,

      days_credit:
        raw.days_credit !== null &&
        raw.days_credit !== undefined

          ? Number(
              raw.days_credit,
            )

          : null,

      charge_amount:
        Number(
          raw.charge_amount ?? 0,
        ),

      contact_name:
        raw.contact_name?.trim() ||
        null,

      will_invoice:
        Boolean(
          raw.will_invoice,
        ),

      statusProject:
        Boolean(
          raw.statusProject,
        ),

    };

  }


  // ======================================================
  // GUARDAR COBROS TEMPORALES
  // ======================================================

  private persistPendingCashCollections(
    projectId: number,
  ): Observable<void> {

    if (
      this.pendingCashCollections
        .length === 0
    ) {

      return of(undefined);

    }


    /**
     * Copiamos la cola.
     *
     * Los guardamos UNO POR UNO para poder quitar
     * del arreglo únicamente los que sí fueron
     * confirmados por backend.
     */

    const queue = [
      ...this.pendingCashCollections,
    ];


    return from(queue)
      .pipe(

        concatMap(
          (collection) =>

            this.projectService
              .createCashCollection(
                projectId,
                collection,
              )
              .pipe(

                tap(() => {

                  const index =
                    this.pendingCashCollections
                      .indexOf(
                        collection,
                      );


                  if (index >= 0) {

                    this.pendingCashCollections
                      .splice(
                        index,
                        1,
                      );

                  }

                }),

              ),
        ),

        toArray(),

        map(
          () => undefined,
        ),

      );

  }


  // ======================================================
  // EDITAR PROYECTO
  // ======================================================

  updateData(): void {

    if (
      this.form.invalid ||
      !this.data?.id ||
      this.savingProject ||
      this.savingCashCollection
    ) {

      this.form.markAllAsTouched();

      return;

    }


    const raw =
      this.form.getRawValue();


    const formData:
      entity.PatchProject = {

      name:
        String(
          raw.name ?? '',
        ).trim(),

      client_id:
        toIdForm(
          raw.client_id,
        ),

      responsible_id:
        toIdForm(
          raw.responsible_id,
        ),

      area_id:
        raw.area_id !== null &&
        raw.area_id !== undefined

          ? Number(
              raw.area_id,
            )

          : null,

      phone:
        String(
          raw.phone ?? '',
        ).trim(),

      email:
        String(
          raw.email ?? '',
        ).trim(),

      location:
        raw.location?.trim() ||
        null,

      days_credit:
        raw.days_credit !== null &&
        raw.days_credit !== undefined

          ? Number(
              raw.days_credit,
            )

          : null,

      charge_amount:
        Number(
          raw.charge_amount ?? 0,
        ),

      contact_name:
        raw.contact_name?.trim() ||
        null,

      will_invoice:
        Boolean(
          raw.will_invoice,
        ),

      statusProject:
        Boolean(
          raw.statusProject,
        ),

    };


    this.savingProject =
      true;


    this.projectService
      .update(
        this.data.id,
        formData,
      )
      .pipe(

        finalize(() => {

          this.savingProject =
            false;

        }),

      )
      .subscribe({

        next: (response) => {

          if (
            response.success
          ) {

            this.closeModal(true);

          }

        },

        error: (err) => {

          console.error(
            'Error al editar proyecto:',
            err,
          );

        },

      });

  }


  // ======================================================
  // FECHA SIN PROBLEMAS DE TIMEZONE
  // ======================================================

  formatDateOnly(
    value:
      string |
      null |
      undefined,
  ): string {

    if (!value) {
      return '-';
    }


    const date =
      value.slice(
        0,
        10,
      );


    const parts =
      date.split('-');


    if (
      parts.length !== 3
    ) {

      return value;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  // ======================================================
  // FOOTER
  // ======================================================

  onBtnsSectionAction(
    action: string,
  ): void {

    switch (action) {

      case 'save':

        if (this.data?.id) {

          this.updateData();

        } else {

          this.saveData();

        }

        break;


      case 'cancel':

        this.closeModal();

        break;

    }

  }


  // ======================================================
  // CLOSE
  // ======================================================

  closeModal(
    saved?: boolean,
  ): void {

    this.dialogRef.close(
      !!saved,
    );

  }

}