import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import * as entity from '../../interfaces/treasury.interfaces';

// =========================================================
// TESORERÍA: CARD DE RESULTADO DE IMPORTACIÓN
// =========================================================

@Component({
  selector: 'app-treasury-import-result-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './treasury-import-result-card.html',
  styleUrl: './treasury-import-result-card.scss',
})
export class TreasuryImportResultCard {
  @Input({ required: true })
  result!: entity.TreasuryImportBankMovementsResponse;

  get isSuccess(): boolean {
    return this.result?.success === true;
  }

  get statusLabel(): string {
    switch (this.result?.status) {
      case 'processed':
        return 'Procesado';

      case 'processed_with_errors':
        return 'Procesado con errores';

      case 'rejected':
        return 'Rechazado';

      default:
        return String(this.result?.status ?? 'Sin estatus');
    }
  }

  get statusClass(): string {
    switch (this.result?.status) {
      case 'processed':
        return 'treasury-import-result__badge--success';

      case 'processed_with_errors':
        return 'treasury-import-result__badge--warning';

      case 'rejected':
        return 'treasury-import-result__badge--danger';

      default:
        return 'treasury-import-result__badge--neutral';
    }
  }

  get cardClass(): string {
    switch (this.result?.status) {
      case 'processed':
        return 'treasury-import-result--success';

      case 'processed_with_errors':
        return 'treasury-import-result--warning';

      case 'rejected':
        return 'treasury-import-result--danger';

      default:
        return 'treasury-import-result--neutral';
    }
  }
}