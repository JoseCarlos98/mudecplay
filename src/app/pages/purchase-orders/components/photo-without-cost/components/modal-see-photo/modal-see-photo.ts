import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';
import { BtnsSection } from '../../../../../../shared/ui/btns-section/btns-section';

import { PendingTicketPhotoRow } from '../../../../interfaces/purchase-orders.interfaces';
import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-see-photo',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ModuleHeader,
    LoadingOverlay,
    BtnsSection,
  ],
  templateUrl: './modal-see-photo.html',
  styleUrl: './modal-see-photo.scss',
})
export class ModalSeePhoto implements OnInit {
  readonly data = inject<PendingTicketPhotoRow>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ModalSeePhoto>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  readonly headerConfig = HEADER_CONFIG;
  readonly loadingPhoto = signal(false);

  photoUrl: string | null = null;
  imageError = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadPhotoUrl();
  }

  get fileName(): string {
    return this.data?.file_name || 'Foto del ticket';
  }

  get projectName(): string {
    return this.data?.project_name || 'Sin proyecto';
  }

  get uploadedByName(): string {
    return this.data?.uploaded_by_name || 'Sin dato';
  }

  get createdAt(): string {
    return this.data?.created_at_date || this.data?.created_at || 'Sin fecha';
  }

  get statusLabel(): string {
    return this.data?.status_label || 'Sin estatus';
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.openInNewTab();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  loadPhotoUrl(): void {
    if (!this.data?.id) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadingPhoto.set(true);
    this.errorMessage = null;
    this.imageError = false;
    this.photoUrl = null;

    this.purchaseOrdersService
      .getTicketPhotoViewUrl(this.data.id)
      .pipe(finalize(() => this.loadingPhoto.set(false)))
      .subscribe({
        next: (response) => {
          this.photoUrl = response.url;
        },
        error: (err) => {
          console.error('Error al obtener URL temporal de la foto:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo cargar la foto del ticket.';
        },
      });
  }

  onImageError(): void {
    this.imageError = true;
    this.errorMessage = 'No se pudo mostrar la imagen.';
  }

  openInNewTab(): void {
    if (!this.photoUrl) return;

    window.open(this.photoUrl, '_blank', 'noopener,noreferrer');
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }
}