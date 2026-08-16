import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { DialogService } from '../../../../shared/services/dialog.service';

import { WarehouseService } from '../../services/warehouse.service';
import * as entity from '../../interfaces/warehouse-interfaces';

import {
  ModalWarehouseReturn,
  WarehouseReturnModalData,
} from '../modal-warehouse-return/modal-warehouse-return';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-warehouse-movements',
  imports: [
    CommonModule,
    MatIconModule,

    ModuleHeader,
    LoadingOverlay,
  ],
  templateUrl: './modal-warehouse-movements.html',
  styleUrl: './modal-warehouse-movements.scss',
})
export class ModalWarehouseMovements implements OnInit {
  readonly data = inject<entity.WarehouseLotResponseDto>(MAT_DIALOG_DATA);

  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogService = inject(DialogService);
  private readonly dialogRef = inject(MatDialogRef<ModalWarehouseMovements>);

  readonly headerConfig = HEADER_CONFIG;

  readonly loading = signal(false);

  movements: entity.WarehouseMovementResponseDto[] = [];
  private hasChanges = false;

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    if (this.loading()) return;

    this.loading.set(true);

    this.warehouseService
      .getWarehouseLotMovements(this.data.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.movements = response ?? [];
          this.syncLotSummaryFromMovements();
        },
        error: (err) => {
          console.error('Error al cargar movimientos del lote:', err);
        },
      });
  }

  private syncLotSummaryFromMovements(): void {
    if (!this.movements.length) return;

    const validMovements = this.movements
      .filter((movement) => !movement.is_cancelled)
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();

        return dateB - dateA;
      });

    const latestMovement = validMovements[0];

    if (!latestMovement) return;

    const available = Number(latestMovement.new_available_quantity ?? 0);
    const original = Number(this.data.original_quantity ?? 0);
    const used = Math.max(0, original - available);

    this.data.available_quantity = available;
    this.data.used_quantity = used;
    this.data.available_cost = Number((available * Number(this.data.unit_cost ?? 0)).toFixed(2));

    if (available <= 0) {
      this.data.status = 'depleted';
    } else if (available >= original) {
      this.data.status = 'available';
    } else {
      this.data.status = 'partial';
    }
  }

  get availableText(): string {
    return this.formatQuantity(this.data.available_quantity, this.data.unit);
  }

  get originalText(): string {
    return this.formatQuantity(this.data.original_quantity, this.data.unit);
  }

  get usedText(): string {
    return this.formatQuantity(this.data.used_quantity, this.data.unit);
  }

  get statusLabel(): string {
    const labels: Record<string, string> = {
      available: 'Disponible',
      partial: 'Parcial',
      depleted: 'Agotado',
      cancelled: 'Cancelado',
    };

    return labels[this.data.status] ?? this.data.status;
  }

  getMovementLabel(type: entity.WarehouseMovementType): string {
    const labels: Record<entity.WarehouseMovementType, string> = {
      in: 'Entrada',
      out: 'Salida',
      return: 'Regreso',
      adjust: 'Ajuste',
    };

    return labels[type] ?? type;
  }

  getMovementIcon(type: entity.WarehouseMovementType): string {
    const icons: Record<entity.WarehouseMovementType, string> = {
      in: 'login',
      out: 'logout',
      return: 'undo',
      adjust: 'tune',
    };

    return icons[type] ?? 'history';
  }

  getMovementClass(type: entity.WarehouseMovementType): string {
    return `movement-card--${type}`;
  }

  getMovementTitle(movement: entity.WarehouseMovementResponseDto): string {
    switch (movement.movement_type) {
      case 'in':
        return 'Entrada al almacén';

      case 'out':
        return 'Salida a proyecto';

      case 'return':
        return movement.related_movement_id
          ? `Regreso de salida #${movement.related_movement_id}`
          : 'Regreso al almacén';

      case 'adjust':
        return 'Ajuste de inventario';

      default:
        return 'Movimiento';
    }
  }

  getMovementSubtitle(movement: entity.WarehouseMovementResponseDto): string {
    return `Movimiento #${movement.id} · ${this.formatDateTime(movement.created_at)}`;
  }

  getRelatedMovementText(movement: entity.WarehouseMovementResponseDto): string {
    if (!movement.related_movement_id) return 'No aplica';

    if (movement.movement_type === 'return') {
      return `Salida #${movement.related_movement_id}`;
    }

    return `Movimiento #${movement.related_movement_id}`;
  }

  canReturnMovement(movement: entity.WarehouseMovementResponseDto): boolean {
    return movement.movement_type === 'out' && !movement.is_cancelled;
  }

  returnMovement(movement: entity.WarehouseMovementResponseDto): void {
    if (!this.canReturnMovement(movement)) return;

    const modalData: WarehouseReturnModalData = {
      lot: this.data,
      movement,
    };

    this.dialogService
      .open(ModalWarehouseReturn, modalData, 'mini')
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.hasChanges = true;
        this.loadMovements();
      });
  }

  formatQuantity(value: number, unit?: string | null): string {
    const quantity = Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    return `${quantity} ${unit ?? ''}`.trim();
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  closeModal(): void {
    this.dialogRef.close(this.hasChanges);
  }
}