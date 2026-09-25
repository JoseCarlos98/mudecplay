import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
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
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  finalize,
} from 'rxjs';

import {
  Autocomplete,
} from '../../../../shared/ui/autocomplete/autocomplete';

import {
  BtnsSection,
} from '../../../../shared/ui/btns-section/btns-section';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

import {
  Catalog,
} from '../../../../shared/interfaces/general-interfaces';

import {
  ProjectClassificationPreviewPayload,
  ProjectClassificationReportService,
} from '../../services/project-classification-report.service';


@Component({
  selector:
    'app-project-classification-report',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    Autocomplete,
    BtnsSection,
    LoadingOverlay,

    MatIconModule,
  ],

  templateUrl:
    './project-classification-report.html',

  styleUrl:
    './project-classification-report.scss',
})
export class ProjectClassificationReport
  implements OnInit, OnDestroy {

  // =====================================================
  // INYECCIONES
  // =====================================================

  private readonly fb =
    inject(FormBuilder);

  private readonly reportService =
    inject(ProjectClassificationReportService);

  private readonly sanitizer =
    inject(DomSanitizer);


  // =====================================================
  // ESTADO
  // =====================================================

  readonly loadingProjects =
    signal(false);

  readonly loadingPreview =
    signal(false);

  readonly errorPreview =
    signal<string | null>(
      null,
    );

  readonly pdfUrl =
    signal<
      SafeResourceUrl | null
    >(
      null,
    );

  projects:
    Catalog[] = [];


  private lastObjectUrl:
    string | null = null;

  private lastGeneratedProjectId:
    number | null = null;


  // =====================================================
  // FORM
  // =====================================================

  readonly formFilters =
    this.fb.group({

      projectId:
        this.fb.control<
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


  // =====================================================
  // CICLO DE VIDA
  // =====================================================

  ngOnInit(): void {

    this.loadProjects();

  }


  ngOnDestroy(): void {

    this.revokeObjectUrl();

  }


  // =====================================================
  // PROYECTOS
  // =====================================================

  private loadProjects(): void {

    this.loadingProjects.set(
      true,
    );


    this.reportService
      .getProjects()
      .pipe(
        finalize(
          () =>
            this.loadingProjects.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          this.projects =
            response ??
            [];

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error cargando proyectos para clasificación:',
            err,
          );


          this.projects =
            [];

        },

      });

  }


  // =====================================================
  // FILTROS
  // =====================================================

  get hasActiveFilters():
    boolean {

    return Boolean(
      this.formFilters
        .getRawValue()
        .projectId,
    );

  }


  get hasActiveSearch():
    boolean {

    return this.hasActiveFilters;

  }


  // =====================================================
  // ACCIONES
  // =====================================================

  onBtnsSectionAction(
    action: string,
  ): void {

    switch (
      action
    ) {

      case 'search':

        this.preview();

        break;


      case 'clean':

        this.clear();

        break;

    }

  }


  // =====================================================
  // PREVIEW
  // =====================================================

  private preview(): void {

    if (
      this.loadingPreview()
    ) {
      return;
    }


    const payload =
      this.buildPayloadOrNull();


    if (!payload) {

      this.formFilters
        .markAllAsTouched();

      return;

    }


    this.loadingPreview.set(
      true,
    );

    this.errorPreview.set(
      null,
    );


    this.reportService
      .preview(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.loadingPreview.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: (
          blob,
        ) => {

          this.setPdfBlob(
            blob,
            payload.projectId,
          );

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error generando reporte por clasificación:',
            err,
          );


          this.errorPreview.set(
            'No se pudo generar el reporte por clasificación.',
          );

        },

      });

  }


  // =====================================================
  // DESCARGAR
  // =====================================================

  downloadPdf(): void {

    if (
      this.loadingPreview()
    ) {
      return;
    }


    const payload =
      this.buildPayloadOrNull();


    if (!payload) {

      this.formFilters
        .markAllAsTouched();

      return;

    }


    /*
     * Si el PDF visible pertenece al mismo proyecto,
     * descargamos exactamente ese archivo.
     */
    if (
      this.lastObjectUrl &&
      this.lastGeneratedProjectId ===
        payload.projectId
    ) {

      this.forceDownload(
        this.lastObjectUrl,
      );

      return;

    }


    /*
     * Si cambió el proyecto desde el último preview,
     * generamos el PDF correcto antes de descargar.
     */
    this.loadingPreview.set(
      true,
    );

    this.errorPreview.set(
      null,
    );


    this.reportService
      .preview(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.loadingPreview.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: (
          blob,
        ) => {

          const url =
            this.setPdfBlob(
              blob,
              payload.projectId,
            );


          this.forceDownload(
            url,
          );

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error descargando reporte por clasificación:',
            err,
          );


          this.errorPreview.set(
            'No se pudo generar el PDF.',
          );

        },

      });

  }


  // =====================================================
  // PAYLOAD
  // =====================================================

  private buildPayloadOrNull():
    ProjectClassificationPreviewPayload |
    null {

    const projectId =
      Number(
        this.formFilters
          .getRawValue()
          .projectId ??
        0,
      );


    if (
      !Number.isFinite(
        projectId,
      ) ||
      projectId <=
        0
    ) {
      return null;
    }


    return {
      projectId,
    };

  }


  // =====================================================
  // PDF
  // =====================================================

  private setPdfBlob(
    blob: Blob,
    projectId: number,
  ): string {

    this.revokeObjectUrl();


    const url =
      URL.createObjectURL(
        blob,
      );


    this.lastObjectUrl =
      url;

    this.lastGeneratedProjectId =
      projectId;


    this.pdfUrl.set(
      this.sanitizer
        .bypassSecurityTrustResourceUrl(
          url,
        ),
    );


    return url;

  }


  private forceDownload(
    url: string,
  ): void {

    const anchor =
      document.createElement(
        'a',
      );


    anchor.href =
      url;

    anchor.download =
      'reporte-gastos-por-clasificacion.pdf';


    document.body
      .appendChild(
        anchor,
      );


    anchor.click();

    anchor.remove();

  }


  private revokeObjectUrl():
    void {

    if (
      this.lastObjectUrl
    ) {

      URL.revokeObjectURL(
        this.lastObjectUrl,
      );

    }


    this.lastObjectUrl =
      null;

    this.lastGeneratedProjectId =
      null;

  }


  // =====================================================
  // LIMPIAR
  // =====================================================

  private clear(): void {

    this.formFilters.reset(
      {
        projectId:
          null,
      },
      {
        emitEvent:
          false,
      },
    );


    this.revokeObjectUrl();

    this.pdfUrl.set(
      null,
    );

    this.errorPreview.set(
      null,
    );

  }

}