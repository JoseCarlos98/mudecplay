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
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

import {
  ProjectAllPreviewPayload,
  ProjectAllReportService,
} from '../../services/project-all-report.service';


@Component({
  selector: 'app-project-all-report',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    Autocomplete,
    BtnsSection,
    LoadingOverlay,

    MatIconModule,
  ],

  templateUrl: './project-all-report.html',
  styleUrl: './project-all-report.scss',
})
export class ProjectAllReport
  implements OnInit, OnDestroy {

  // =====================================================
  // INYECCIONES
  // =====================================================

  private readonly fb =
    inject(FormBuilder);

  private readonly reportService =
    inject(ProjectAllReportService);

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
    signal<string | null>(null);

  readonly pdfUrl =
    signal<SafeResourceUrl | null>(null);

  projects:
    Catalog[] = [];

  private lastObjectUrl:
    string | null = null;


  // =====================================================
  // FORM
  // =====================================================

  readonly formFilters =
    this.fb.group({

      projectId:
        this.fb.control<
          number | string | null
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
  // CATÁLOGO DE PROYECTOS
  // =====================================================

  private loadProjects(): void {

    this.loadingProjects.set(true);


    this.reportService
      .getProjects()
      .pipe(
        finalize(
          () =>
            this.loadingProjects.set(false),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          this.projects =
            response ?? [];

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error cargando proyectos:',
            err,
          );


          this.projects = [];

        },

      });

  }


  // =====================================================
  // ESTADO DE FILTROS
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
  // BOTONES BUSCAR / LIMPIAR
  // =====================================================

  onBtnsSectionAction(
    action: string,
  ): void {

    switch (action) {

      case 'search':

        this.preview();

        break;


      case 'clean':

        this.clear();

        break;

    }

  }


  // =====================================================
  // PREVIEW PDF
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


    this.loadingPreview.set(true);

    this.errorPreview.set(null);


    this.reportService
      .preview(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.loadingPreview.set(false),
        ),
      )
      .subscribe({

        next: (
          blob,
        ) => {

          this.setPdfBlob(
            blob,
          );

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error generando Reporte ALL:',
            err,
          );


          this.errorPreview.set(
            'No se pudo generar el reporte.',
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


    /*
     * Si ya tenemos el PDF generado,
     * descargamos exactamente ese mismo.
     */
    if (
      this.lastObjectUrl
    ) {

      this.forceDownload(
        this.lastObjectUrl,
      );

      return;

    }


    const payload =
      this.buildPayloadOrNull();


    if (!payload) {

      this.formFilters
        .markAllAsTouched();

      return;

    }


    this.loadingPreview.set(true);

    this.errorPreview.set(null);


    this.reportService
      .preview(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.loadingPreview.set(false),
        ),
      )
      .subscribe({

        next: (
          blob,
        ) => {

          const url =
            this.setPdfBlob(
              blob,
            );


          this.forceDownload(
            url,
          );

        },

        error: (
          err,
        ) => {

          console.error(
            '[REPORTES] Error descargando Reporte ALL:',
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
    ProjectAllPreviewPayload | null {

    const projectId =
      Number(
        this.formFilters
          .getRawValue()
          .projectId ??
        0,
      );


    if (
      !Number.isFinite(projectId) ||
      projectId <= 0
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
  ): string {

    this.revokeObjectUrl();


    const url =
      URL.createObjectURL(
        blob,
      );


    this.lastObjectUrl =
      url;


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
      'reporte-financiero-proyecto.pdf';


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
      !this.lastObjectUrl
    ) {
      return;
    }


    URL.revokeObjectURL(
      this.lastObjectUrl,
    );


    this.lastObjectUrl =
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

    this.pdfUrl.set(null);

    this.errorPreview.set(null);

  }

}