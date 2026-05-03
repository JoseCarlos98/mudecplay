import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export type SundaySourceType = 'saturday' | 'friday' | null;

export interface ModalSundayData {
  work_date: string;
  source_date: string | null;
  source_type: SundaySourceType;
  source_assignments_count: number;
  message: string;
}

export interface ModalSundayResult {
  action: 'confirmed';
}

@Component({
  selector: 'app-modal-sunday',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    BtnsSection,
  ],
  templateUrl: './modal-sunday.html',
  styleUrl: './modal-sunday.scss',
})
export class ModalSunday {
  readonly data = inject<ModalSundayData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalSunday>);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  get sourceLabel(): string {
    if (this.data.source_type === 'saturday') return 'Sábado';
    if (this.data.source_type === 'friday') return 'Viernes';

    return 'Sin fuente';
  }

  get sourceDateLabel(): string {
    return this.data.source_date ?? 'Sin fecha';
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.confirm();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  private confirm(): void {
    if (this.saving) return;

    this.saving = true;

    const result: ModalSundayResult = {
      action: 'confirmed',
    };

    this.closeModal(result);
  }

  closeModal(result?: ModalSundayResult): void {
    this.dialogRef.close(result ?? null);
  }
}