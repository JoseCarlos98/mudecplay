import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import Panzoom from '@panzoom/panzoom';

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
export class ModalSeePhoto implements OnInit, OnDestroy {
  readonly data = inject<PendingTicketPhotoRow>(MAT_DIALOG_DATA);

  @ViewChild('photoViewport') photoViewport?: ElementRef<HTMLElement>;
  @ViewChild('photoImage') photoImage?: ElementRef<HTMLImageElement>;

  private readonly dialogRef = inject(MatDialogRef<ModalSeePhoto>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  private panzoom?: ReturnType<typeof Panzoom>;
  private wheelTarget?: HTMLElement;

  readonly headerConfig = HEADER_CONFIG;
  readonly loadingPhoto = signal(false);
  readonly zoomReady = signal(false);

  photoUrl: string | null = null;
  imageError = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadPhotoUrl();
  }

  ngOnDestroy(): void {
    this.destroyPanzoom();
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

    this.destroyPanzoom();

    this.loadingPhoto.set(true);
    this.zoomReady.set(false);
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

  onImageLoaded(): void {
    this.setupPanzoom();
  }

  onImageError(): void {
    this.destroyPanzoom();
    this.imageError = true;
    this.errorMessage = 'No se pudo mostrar la imagen.';
  }

  zoomIn(): void {
    if (!this.panzoom) return;

    this.panzoom.zoomIn({
      animate: true,
    });
  }

  zoomOut(): void {
    if (!this.panzoom) return;

    const currentScale = this.panzoom.getScale();

    if (currentScale <= 1.01) {
      this.resetZoom();
      return;
    }

    this.panzoom.zoomOut({
      animate: true,
    });
  }

  resetZoom(): void {
    if (!this.panzoom) return;

    this.panzoom.reset({
      animate: true,
    });
  }

  openInNewTab(): void {
    if (!this.photoUrl) return;

    window.open(this.photoUrl, '_blank', 'noopener,noreferrer');
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }

  private setupPanzoom(): void {
    const image = this.photoImage?.nativeElement;
    const viewport = this.photoViewport?.nativeElement;

    if (!image || !viewport) return;

    this.destroyPanzoom();

    this.panzoom = Panzoom(image, {
      minScale: 1,
      maxScale: 12,
      step: 0.5,
      startScale: 1,
      canvas: true,
    });

    this.wheelTarget = viewport;
    this.wheelTarget.addEventListener('wheel', this.handleWheel, {
      passive: false,
    });

    this.zoomReady.set(true);

    requestAnimationFrame(() => {
      this.panzoom?.reset({
        animate: false,
      });
    });
  }

  private destroyPanzoom(): void {
    if (this.wheelTarget) {
      this.wheelTarget.removeEventListener('wheel', this.handleWheel);
      this.wheelTarget = undefined;
    }

    this.panzoom?.destroy();
    this.panzoom = undefined;
    this.zoomReady.set(false);
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.panzoom) return;

    event.preventDefault();
    this.panzoom.zoomWithWheel(event);
  };
}