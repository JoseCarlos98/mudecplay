import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { ModuleHeader } from '../../../shared/module-header/module-header';

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, ModuleHeader],
  templateUrl: './expense-modal.html',
  styleUrl: './expense-modal.scss',
})
export class ExpenseModal {
readonly data = inject(MAT_DIALOG_DATA);


  cerrarModal(event?:any) {
    console.log(event);
    console.log(this.data);
    
    this.data.dialogRef.close();
  }
}
