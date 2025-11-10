import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { ConfirmModalAction } from '../../interfaces/general-interfaces';

@Component({
  selector: 'app-confirm-modal',
  imports: [CommonModule, MatDialogContent, MatIcon],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModal {
  private readonly dialogRef = inject(MatDialogRef<ConfirmModal>);
  readonly data = inject<ConfirmModalAction>(MAT_DIALOG_DATA);

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}
