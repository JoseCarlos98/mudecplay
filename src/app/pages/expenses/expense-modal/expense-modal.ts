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

  onHeaderAction(action: string) {
  switch (action) {
    case 'new':
      break;
    case 'upload':
      // subir XML
      break;
    case 'refresh':
      break;
    case 'filter':
      // abrir filtro
      console.log('filter');
      
      break;
    case 'close':
      // cerrar modal o navegar atrás
      break;
  }
}
  cerrarModal(event?:any) {
    console.log(event);
    console.log(this.data);
    
    this.data.dialogRef.close();
  }
}
