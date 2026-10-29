import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { AttendanceClockImportService } from './services/attendance-clock-import.service';
import { ClockImportPreviewResponse } from './interfaces/attendance-clock-import.interfaces';

const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
  showNew: false,
  showUploadXml: false,
};

@Component({
  selector: 'app-attendance-clock-import',
  standalone: true,
  imports: [CommonModule, ModuleHeader, LoadingOverlay, MatIconModule],
  templateUrl: './attendance-clock-import.html',
  styleUrl: './attendance-clock-import.scss',
})
export class AttendanceClockImport {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly importService = inject(AttendanceClockImportService);

  @ViewChild('excelInput') private excelInput?: ElementRef<HTMLInputElement>;

  readonly headerConfig = HEADER_CONFIG;
  readonly loadingPreview = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<ClockImportPreviewResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);

  onHeaderAction(action: string): void {
    if (action === 'back') this.goBack();
  }

  goBack(): void {
    void this.router.navigate(['llegadas-retardos'], {
      relativeTo: this.route.parent ?? this.route,
    });
  }

  openFilePicker(): void {
    if (this.loadingPreview()) return;
    this.excelInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    // Permite seleccionar nuevamente el mismo archivo después de corregirlo.
    input.value = '';
    if (!file || this.loadingPreview()) return;

    // No mostrar información obsoleta al cambiar de archivo.
    this.preview.set(null);
    this.errorMessage.set(null);
    this.selectedFile.set(file);

    if (!file.name.toLowerCase().endsWith('.xls')) {
      this.errorMessage.set('Selecciona un archivo de reloj checador con extensión .xls.');
      return;
    }
    if (file.size === 0) {
      this.errorMessage.set('El archivo seleccionado está vacío.');
      return;
    }
    if (file.size > MAX_EXCEL_BYTES) {
      this.errorMessage.set('El archivo supera el límite de 10 MB.');
      return;
    }

    // Un solo clic: seleccionar archivo también inicia su análisis.
    this.loadingPreview.set(true);
    this.importService.preview(file)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (result) => this.preview.set(result),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) {
      const texts = message.filter((item): item is string => typeof item === 'string');
      if (texts.length) return texts.join(' ');
    }
    return 'No se pudo analizar el Excel. Verifica el archivo y vuelve a intentarlo.';
  }

  formatApiDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  formatFileSize(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
