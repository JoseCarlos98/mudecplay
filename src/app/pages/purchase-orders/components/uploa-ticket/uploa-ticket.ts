import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, switchMap, throwError } from 'rxjs';

import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import { BtnsSection, ModuleFooterAction } from '../../../../shared/ui/btns-section/btns-section';

interface TicketFilePreview {
  name: string;
  sizeLabel: string;
  typeLabel: string;
  previewUrl: string | null;
}

@Component({
  selector: 'app-uploa-ticket',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    Autocomplete,
    BtnsSection
  ],
  templateUrl: './uploa-ticket.html',
  styleUrl: './uploa-ticket.scss',
})
export class UploaTicket {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  readonly maxFileSizeMb = 10;
  readonly maxFileSizeBytes = this.maxFileSizeMb * 1024 * 1024;

  readonly form = this.fb.group({
    project_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
  });

  selectedFile: File | null = null;
  filePreview: TicketFilePreview | null = null;

  isDragging = false;
  saving = false;
  errorMessage: string | null = null;

  get canSave(): boolean {
    return this.form.valid && !!this.selectedFile && !this.saving;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.setFile(file);
    }
  }

  onBtnsSectionAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'save':
        this.save();
        break;

      case 'cancel':
        this.cancel();
        break;

      default:
        break;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.setFile(file);
    }

    input.value = '';
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    this.errorMessage = null;
  }

  cancel(): void {
    this.form.reset({
      project_id: null,
    });

    this.removeFile();
  }

  goBack(): void {
    this.router.navigateByUrl('/ordenes-compra');
  }

  save(): void {
    this.errorMessage = null;

    if (!this.canSave) {
      this.form.markAllAsTouched();

      if (!this.selectedFile) {
        this.errorMessage = 'Debes seleccionar una foto del ticket.';
      }

      return;
    }

    const projectId = this.getCatalogId(this.form.getRawValue().project_id);
    const file = this.selectedFile;

    if (!projectId) {
      this.form.controls.project_id.setErrors({ required: true });
      this.form.markAllAsTouched();
      this.errorMessage = 'Debes seleccionar un proyecto válido.';
      return;
    }

    if (!file) {
      this.errorMessage = 'Debes seleccionar una foto del ticket.';
      return;
    }

    this.saving = true;

    this.purchaseOrdersService
      .getTicketPhotoUploadUrl({
        fileName: file.name,
        fileType: this.getFileMimeType(file),
      })
      .pipe(
        switchMap((uploadData) =>
          this.purchaseOrdersService
            .uploadTicketPhotoToStorage(uploadData.uploadUrl, file)
            .pipe(
              switchMap(() =>
                this.purchaseOrdersService.createTicketPhoto({
                  purchase_order_id: null,
                  project_id: projectId,
                  file_name: file.name,
                  mime_type: this.getFileMimeType(file),
                  size_bytes: file.size,
                  s3_key: uploadData.key,
                  public_url: uploadData.publicUrl,
                  notes: null,
                }),
              ),
            ),
        ),
        catchError((err) => {
          console.error('Error al subir ticket:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo subir el ticket. Intenta nuevamente.';

          return throwError(() => err);
        }),
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.form.reset({
            project_id: null,
          });

          this.removeFile();

          // Después podemos cambiar esto por snackbar o redirección.
          console.log('Ticket subido correctamente.');
        },
      });
  }

  private setFile(file: File): void {
    this.errorMessage = null;

    if (!this.isValidImage(file)) {
      this.selectedFile = null;
      this.filePreview = null;
      this.errorMessage = 'Solo puedes subir imágenes JPG, PNG, WEBP o HEIC.';
      return;
    }

    if (file.size > this.maxFileSizeBytes) {
      this.selectedFile = null;
      this.filePreview = null;
      this.errorMessage = `La imagen no puede pesar más de ${this.maxFileSizeMb} MB.`;
      return;
    }

    this.selectedFile = file;

    this.filePreview = {
      name: file.name,
      sizeLabel: this.formatFileSize(file.size),
      typeLabel: this.getFileTypeLabel(file),
      previewUrl: null,
    };

    const reader = new FileReader();

    reader.onload = () => {
      this.filePreview = {
        ...this.filePreview!,
        previewUrl: String(reader.result),
      };
    };

    reader.readAsDataURL(file);
  }

  private isValidImage(file: File): boolean {
    const mimeType = this.getFileMimeType(file).toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

    return (
      allowedMimeTypes.includes(mimeType) ||
      !!extension && allowedExtensions.includes(extension)
    );
  }

  private getFileMimeType(file: File): string {
    return file.type || 'application/octet-stream';
  }

  private formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;

    const kb = size / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private getFileTypeLabel(file: File): string {
    const extension = file.name.split('.').pop()?.toUpperCase();

    return extension || 'Imagen';
  }

  private getCatalogId(value: Catalog | number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value.id);

    return Number.isFinite(parsed) ? parsed : null;
  }
}