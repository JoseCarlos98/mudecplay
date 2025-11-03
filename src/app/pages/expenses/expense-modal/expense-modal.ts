import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader } from '../../../shared/module-header/module-header';

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, ModuleHeader],
  templateUrl: './expense-modal.html',
  styleUrl: './expense-modal.scss',
})
export class ExpenseModal implements AfterViewInit {
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);

  ngAfterViewInit(): void {
    console.log('Data', this.data);
  }

  onHeaderAction(action: string) {
    switch (action) {
      case 'close':
        this.cerrarModal();
        break;
    }
  }


  cerrarModal() {
    this.dialogRef.close();
  }
}
