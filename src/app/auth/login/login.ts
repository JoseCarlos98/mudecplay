import { Component, OnInit, inject, signal } from '@angular/core';
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private readonly rememberedEmailKey = 'mp_remembered_email';

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
    rememberMe: [false],
  });

  isSubmitting = signal(false);
  showPassword = false;
  loginError: string | null = null;

  ngOnInit(): void {
    const rememberedEmail = localStorage.getItem(this.rememberedEmailKey);

    if (rememberedEmail) {
      this.form.patchValue({
        email: rememberedEmail,
        rememberMe: true,
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginError = null;
    this.isSubmitting.set(true);

    const { email, password, rememberMe } = this.form.value as {
      email: string;
      password: string;
      rememberMe: boolean;
    };

    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);

        if (rememberMe) {
          localStorage.setItem(this.rememberedEmailKey, email);
        } else {
          localStorage.removeItem(this.rememberedEmailKey);
        }

        const roles: string[] = res?.user?.roles ?? [];

        const roleHome: Record<string, string> = {
          ADMIN_GENERAL: '/gastos',

          // Gastos, almacén y cuentas por cobrar actuales
          GASTOS_EDITOR: '/gastos',
          ALMACEN_EDITOR: '/almacen',
          CUENTAS_POR_COBRAR_EDITOR: '/cuentas-por-cobrar',
          REPORTES_EMISOR: '/reportes',

          // Tesorería
          TESORERIA_CUENTAS_BANCARIAS_EDITOR:
            '/tesoreria/cuentas-bancarias',

          TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR:
            '/tesoreria/cargar-movimientos',

          TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR:
            '/tesoreria/movimientos-bancarios',

          TESORERIA_CUENTAS_POR_PAGAR_EDITOR:
            '/tesoreria/cuentas-por-pagar',

          TESORERIA_CUENTAS_POR_COBRAR_EDITOR:
            '/tesoreria/cuentas-por-cobrar',

          // Órdenes de compra
          ORDENES_COMPRA_EDITOR:
            '/ordenes-compra',

          ORDENES_COMPRA_TICKETS_SUBIDOR:
            '/ordenes-compra/subir-ticket-gasto',

          ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR:
            '/ordenes-compra/fotos-sin-gasto',

          // Catálogos
          PROVEEDORES_EDITOR: '/proveedores',
          PROYECTOS_EDITOR: '/proyectos',
          CLIENTES_EDITOR: '/clientes',
          RESPONSABLES_EDITOR: '/responsables',
          PRODUCTOS_EDITOR: '/productos',
          USUARIOS_EDITOR: '/usuarios',

          AREAS_EDITOR: '/areas',
          AREAS_EMPLEADOS_EDITOR: '/areas-empleados',

          // Mano de obra
          EMPLEADOS_EDITOR: '/mano-de-obra/empleados',
          ASISTENCIA_EDITOR: '/mano-de-obra/asistencia-diaria',
          LLEGADAS_RETARDOS_EDITOR:
            '/mano-de-obra/llegadas-retardos',
          HORAS_EXTRAS_EDITOR:
            '/mano-de-obra/horas-extras',

          PRESTAMOS_EDITOR: '/mano-de-obra',
          NOMINA_EDITOR: '/mano-de-obra',
        };

        const rolePriority: string[] = [
          'ADMIN_GENERAL',

          // Módulos generales
          'GASTOS_EDITOR',
          'ALMACEN_EDITOR',
          'CUENTAS_POR_COBRAR_EDITOR',

          // Tesorería
          'TESORERIA_CUENTAS_BANCARIAS_EDITOR',
          'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR',
          'TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR',
          'TESORERIA_CUENTAS_POR_PAGAR_EDITOR',
          'TESORERIA_CUENTAS_POR_COBRAR_EDITOR',

          // Órdenes de compra
          'ORDENES_COMPRA_EDITOR',
          'ORDENES_COMPRA_TICKETS_SUBIDOR',
          'ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR',

          'REPORTES_EMISOR',

          // Mano de obra
          'EMPLEADOS_EDITOR',
          'ASISTENCIA_EDITOR',
          'LLEGADAS_RETARDOS_EDITOR',
          'HORAS_EXTRAS_EDITOR',
          'PRESTAMOS_EDITOR',
          'NOMINA_EDITOR',

          // Catálogos
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
          err?.error?.message ||
          'Error al iniciar sesión. Verifica tus datos.';
      },
    });
  }

  showFieldError(field: string): boolean {
    const control = this.form.get(field);

    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onForgotPassword(): void {
    this.loginError =
      'La recuperación de contraseña aún no está disponible. Contacta al administrador.';
  }

  onSsoLogin(): void {
    this.loginError =
      'El inicio de sesión con SSO aún no está disponible.';
  }
}