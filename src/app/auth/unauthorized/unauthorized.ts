import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterModule],
  template: `
    <div style="padding:24px">
      <h2>Sin permisos</h2>
      <p>No tienes permisos para acceder a esta sección.</p>
      <a routerLink="/gastos">Volver</a>
    </div>
  `,
})
export class Unauthorized {}
