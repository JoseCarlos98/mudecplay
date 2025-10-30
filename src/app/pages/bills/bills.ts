import { Component } from '@angular/core';
import { ModuleHeader } from "../../shared/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
interface UserData {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}
@Component({
  selector: 'app-bills',
  imports: [ModuleHeader, FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './bills.html',
  styleUrl: './bills.scss',
})
export class Bills {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);

  displayedColumns: string[] = ['id', 'nombre', 'correo', 'rol', 'acciones'];
  dataSource = new MatTableDataSource<UserData>([
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
  ]);

  editar(element: UserData) {
    console.log('Editar', element);
  }

  eliminar(element: UserData) {
    console.log('Eliminar', element);
  }
}
