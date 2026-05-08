import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
  });

  isSubmitting = signal(false);
  showPassword = false;
  loginError: string | null = null;

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginError = null;
    this.isSubmitting.set(true);

    const { email, password } = this.form.value as {
      email: string;
      password: string;
    };

    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);

        const roles: string[] = res?.user?.roles ?? [];

        const roleHome: Record<string, string> = {
          ADMIN_GENERAL: '/gastos',

          GASTOS_EDITOR: '/gastos',
          ALMACEN_EDITOR: '/almacen',
          CUENTAS_POR_COBRAR_EDITOR: '/cuentas-por-cobrar',
          REPORTES_EMISOR: '/reportes',

          PROVEEDORES_EDITOR: '/proveedores',
          PROYECTOS_EDITOR: '/proyectos',
          CLIENTES_EDITOR: '/clientes',
          RESPONSABLES_EDITOR: '/responsables',
          PRODUCTOS_EDITOR: '/productos',
          USUARIOS_EDITOR: '/usuarios',

          AREAS_EDITOR: '/areas',
          AREAS_EMPLEADOS_EDITOR: '/areas-empleados',

          EMPLEADOS_EDITOR: '/mano-de-obra/empleados',
          ASISTENCIA_EDITOR: '/mano-de-obra/asistencia-diaria',
          LLEGADAS_RETARDOS_EDITOR: '/mano-de-obra/llegadas-retardos',
          HORAS_EXTRAS_EDITOR: '/mano-de-obra/horas-extras',

          PRESTAMOS_EDITOR: '/mano-de-obra',
          NOMINA_EDITOR: '/mano-de-obra',
        };

        const rolePriority: string[] = [
          'ADMIN_GENERAL',

          'GASTOS_EDITOR',
          'ALMACEN_EDITOR',
          'CUENTAS_POR_COBRAR_EDITOR',
          'REPORTES_EMISOR',

          'EMPLEADOS_EDITOR',
          'ASISTENCIA_EDITOR',
          'LLEGADAS_RETARDOS_EDITOR',
          'HORAS_EXTRAS_EDITOR',
          'PRESTAMOS_EDITOR',
          'NOMINA_EDITOR',

          'PROVEEDORES_EDITOR',
          'PROYECTOS_EDITOR',
          'CLIENTES_EDITOR',
          'RESPONSABLES_EDITOR',
          'PRODUCTOS_EDITOR',
          'USUARIOS_EDITOR',
          'AREAS_EDITOR',
          'AREAS_EMPLEADOS_EDITOR',
        ];

        const firstRoleWithRoute = rolePriority.find(
          (role) => roles.includes(role) && !!roleHome[role],
        );

        if (firstRoleWithRoute) {
          this.router.navigateByUrl(roleHome[firstRoleWithRoute]);
          return;
        }

        this.router.navigateByUrl('/unauthorized');
      },

      error: (err) => {
        this.isSubmitting.set(false);
        this.loginError =
          err?.error?.message || 'Error al iniciar sesión. Verifica tus datos.';
      },
    });
  }

  showFieldError(field: string): boolean {
    const control = this.form.get(field);

    return !!control && control.invalid && (control.dirty || control.touched);
  }
}