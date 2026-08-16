import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { TreasuryService } from '../../services/treasury.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/treasury.interfaces';

// Componentes
import { TreasuryImportResultCard } from '../treasury-import-result-card/treasury-import-result-card';

// =========================================================
// TESORERÍA: CARGA DE MOVIMIENTOS BANCARIOS
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {};

@Component({
  selector: 'app-treasury-bank-movement-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    BtnsSection,
    InputSelect,
    LoadingOverlay,
    TreasuryImportResultCard,

    // Material
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './treasury-bank-movement-upload.html',
  styleUrl: './treasury-bank-movement-upload.scss',
})
export class TreasuryBankMovementUpload implements OnInit {
  @ViewChild('fileInput')
  fileInput!: ElementRef<HTMLInputElement>;

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly catalogsService = inject(CatalogsService);
  private readonly treasuryService = inject(TreasuryService);
  private readonly dialogService = inject(DialogService);

  // =========================================================
  // CONFIG UI
  // =========================================================

  readonly headerConfig = HEADER_CONFIG;

  readonly loadingPage = signal(false);
  readonly uploading = signal(false);
  readonly isDragging = signal(false);

  bankAccountOptions: Catalog[] = [];

  selectedFile: File | null = null;
  importResult: entity.TreasuryImportBankMovementsResponse | null = null;

  // =========================================================
  // FORM
  // =========================================================

  form = this.fb.group({
    bank_account_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
  });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadCatalogs();
  }

  // =========================================================
  // GETTERS UI
  // =========================================================

  get importDisabled(): boolean {
    return this.form.invalid || !this.selectedFile || this.uploading();
  }

  get selectedFileName(): string {
    return this.selectedFile?.name ?? '';
  }

  get selectedFileSize(): string {
    if (!this.selectedFile) return '';

    return this.formatFileSize(this.selectedFile.size);
  }

  // =========================================================
  // CARGA DE CATÁLOGOS
  // =========================================================

  private loadCatalogs(): void {
    this.loadingPage.set(true);

    this.catalogsService
      .treasuryBankAccountsCatalog()
      .pipe(finalize(() => this.loadingPage.set(false)))
      .subscribe({
        next: (response) => {
          this.bankAccountOptions = response ?? [];
        },
        error: (err) => {
          console.error('Error cargando cuentas bancarias:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudieron cargar las cuentas bancarias.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  // =========================================================
  // ARCHIVO BANCARIO TXT O PDF
  // =========================================================

  openFileSelector(): void {
    if (this.uploading()) return;

    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.setSelectedFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.uploading()) return;

    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);

    if (this.uploading()) return;

    const file = event.dataTransfer?.files?.[0] ?? null;

    this.setSelectedFile(file);
  }

  removeSelectedFile(): void {
    this.selectedFile = null;

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private setSelectedFile(file: File | null): void {
    if (!file) return;

    const fileName = file.name.toLowerCase();

    const isAllowedFile =
      fileName.endsWith('.txt') ||
      fileName.endsWith('.pdf');

    if (!isAllowedFile) {
      this.removeSelectedFile();

      this.dialogService
        .confirm({
          title: 'Archivo no válido',
          message:
            'Solo se permiten archivos con extensión .txt o .pdf.',
          confirmText: 'OK',
          cancelText: '',
        })
        .subscribe();

      return;
    }

    this.importResult = null;
    this.selectedFile = file;
  }

  // =========================================================
  // IMPORTACIÓN
  // =========================================================

  onFooterAction(action: ModuleFooterAction | string): void {
    switch (action) {
      case 'cancel':
        this.clearForm();
        break;

      case 'save':
        this.importMovements();
        break;

      default:
        break;
    }
  }

  importMovements(): void {
    if (this.importDisabled) {
      this.form.markAllAsTouched();

      if (!this.selectedFile) {
        this.dialogService
          .confirm({
            title: 'Archivo requerido',
            message: 'Selecciona un archivo TXT o PDF para importar movimientos.', 
            confirmText: 'OK',
            cancelText: '',
          })
          .subscribe();
      }

      return;
    }

    const bankAccountId = this.getNumberId(
      this.form.getRawValue().bank_account_id,
    );

    if (!bankAccountId || !this.selectedFile) return;

    const formData = new FormData();

    formData.append('bank_account_id', String(bankAccountId));
    formData.append('file', this.selectedFile);

    this.uploading.set(true);

    this.treasuryService
      .importBankMovements(formData)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (response) => {
          this.importResult = response;

          if (response?.success === true) {
            /**
             * Importante:
             * Después de una importación correcta se limpia solo el archivo.
             * La cuenta bancaria se mantiene seleccionada para poder subir otro archivo
             * de la misma cuenta sin volver a elegirla.
             *
             * Como selectedFile queda null, el botón "Importar movimientos"
             * vuelve a quedar bloqueado hasta seleccionar otro archivo.
             */
            this.removeSelectedFile();
            return;
          }

          this.dialogService
            .confirm({
              title: 'Importación no completada',
              message:
                response?.message ??
                'No se pudo completar la importación del archivo.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
        error: (err) => {
          console.error('Error importando movimientos bancarios:', err);

          this.dialogService
            .confirm({
              title: 'Error al importar',
              message:
                err?.error?.message ??
                'No se pudo importar el archivo bancario.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  clearForm(): void {
    this.form.reset(
      {
        bank_account_id: null,
      },
      { emitEvent: false },
    );

    this.removeSelectedFile();
    this.importResult = null;
  }

  goToImportFiles(): void {
    this.router.navigateByUrl('/tesoreria/importaciones');
  }

  goToBankMovements(): void {
    this.router.navigateByUrl('/tesoreria/movimientos-bancarios');
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getCatalogValue(
    value: Catalog | number | string | null,
  ): string | number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return value.id;
  }

  private getNumberId(value: unknown): number | null {
    const rawId = this.getCatalogValue(
      value as Catalog | number | string | null,
    );

    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }

  private formatFileSize(size: number): string {
    if (!size) return '0 KB';

    const kb = size / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }
}