
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';

import {
  finalize,
  Subscription,
} from 'rxjs';

import {
  DateRangeValue,
  InputDate,
} from '../../../../shared/ui/input-date/input-date';

import {
  BtnsSection,
} from '../../../../shared/ui/btns-section/btns-section';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

import {
  toApiDate,
} from '../../../../shared/helpers/general-helpers';

import {
  ReportsApiService,
} from '../../services/reports-api.service';


interface AttendanceRangePayload {
  startDate: string;
  endDate: string;
}


@Component({
  selector: 'app-attendance-report',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    BtnsSection,
    LoadingOverlay,
  ],

  templateUrl: './attendance-report.html',
  styleUrl: './attendance-report.scss',
})
export class AttendanceReport implements OnDestroy {

  // =====================================================
  // INYECCIONES
  // =====================================================

  private readonly fb = inject(FormBuilder);

  private readonly api = inject(ReportsApiService);

  private readonly sanitizer = inject(DomSanitizer);

  private readonly destroyRef = inject(DestroyRef);


  // =====================================================
  // FORMULARIO
  // =====================================================

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(
      null,
    ),
  });


  // =====================================================
  // ESTADO
  // =====================================================

  readonly loadingPreview = signal(false);

  readonly errorPreview = signal<string | null>(null);

  readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  private lastObjectUrl: string | null = null;

  private request: Subscription | null = null;


  // =====================================================
  // FILTROS ACTIVOS
  // =====================================================

  get hasActiveSearch(): boolean {
    return this.buildPayloadOrNull() !== null;
  }


  constructor() {

    // Si cambia el rango, invalidamos el PDF anterior.
    // No se consulta automáticamente.

    this.formFilters.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {

        this.request?.unsubscribe();
        this.request = null;

        this.loadingPreview.set(false);
        this.errorPreview.set(null);

        this.clearPdf();
      });
  }


  // =====================================================
  // ACCIONES
  // =====================================================

  onBtnsSectionAction(action: string): void {

    if (action === 'search') {
      this.preview();
    }
  }


  // =====================================================
  // CONSULTAR / GENERAR PDF
  // =====================================================

  private preview(): void {

    if (this.loadingPreview()) {
      return;
    }

    const payload = this.buildPayloadOrNull();

    if (!payload) {
      this.formFilters.markAllAsTouched();

      this.errorPreview.set(
        'Selecciona un rango de fechas válido y completo.',
      );

      return;
    }

    this.clearPdf();
    this.errorPreview.set(null);
    this.loadingPreview.set(true);

    this.request = this.api
      .previewAttendanceReport(payload)
      .pipe(
        finalize(() => this.loadingPreview.set(false)),
      )
      .subscribe({

        next: (blob: Blob) => {

          if (!blob.size || !blob.type.includes('pdf')) {

            this.errorPreview.set(
              'El servidor no devolvió un archivo PDF válido.',
            );

            return;
          }

          this.setPdfBlob(blob);
        },

        error: (error: unknown) => {

          console.error(
            '[REPORTES] Error generando asistencia:',
            error,
          );

          this.errorPreview.set(
            'No se pudo generar el reporte de asistencia.',
          );
        },
      });
  }


  // =====================================================
  // CONSTRUIR FILTROS
  // =====================================================

  private buildPayloadOrNull():
    AttendanceRangePayload | null {

    const range =
      this.formFilters.controls.dateRange.value;

    const startDate =
      toApiDate(range?.startDate);

    const endDate =
      toApiDate(range?.endDate);

    if (
      !startDate ||
      !endDate ||
      startDate > endDate
    ) {
      return null;
    }

    return {
      startDate,
      endDate,
    };
  }


  // =====================================================
  // PDF
  // =====================================================

  private setPdfBlob(blob: Blob): void {

    this.clearPdf();

    const url = URL.createObjectURL(blob);

    this.lastObjectUrl = url;

    this.pdfUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(url),
    );
  }


  private clearPdf(): void {

    this.pdfUrl.set(null);

    if (this.lastObjectUrl) {

      URL.revokeObjectURL(this.lastObjectUrl);

      this.lastObjectUrl = null;
    }
  }


  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.request?.unsubscribe();

    this.clearPdf();
  }
}
