import { Component } from '@angular/core';
import { ModuleHeader } from "../../shared/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DataTable } from '../../shared/data-table/data-table';
interface UserData {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}
@Component({
  selector: 'app-bills',
  imports: [DataTable, MatPaginatorModule, ModuleHeader, FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './bills.html',
  styleUrl: './bills.scss',
})
export class Bills {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  users = [
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
    { id: 1, nombre: 'Carlos López', correo: 'carlos@empresa.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@empresa.com', rol: 'Editor' },
    { id: 3, nombre: 'Luis Pérez', correo: 'luis@empresa.com', rol: 'Visualizador' },
  ];

  columnsConfig = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'correo', label: 'Correo' },
    { key: 'rol', label: 'Rol' }
  ];

  displayedColumns = ['nombre', 'correo', 'rol', 'acciones'];

  onEdit(user: any) {
    console.log('Editar', user);
  }

  onDelete(user: any) {
    console.log('Eliminar', user);
  }
}
