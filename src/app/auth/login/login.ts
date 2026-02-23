import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

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

    const { email, password } = this.form.value as { email: string; password: string };

    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);

        const roles: string[] = res?.user?.roles ?? [];

        const roleHome: Record<string, string> = {
          ADMIN_GENERAL: '/gastos',
          GASTOS_EDITOR: '/gastos',
          REPORTES_EMISOR: '/reportes',
          PROVEEDORES_EDITOR: '/proveedores',
          PROYECTOS_EDITOR: '/proyectos',
          CLIENTES_EDITOR: '/clientes',
          RESPONSABLES_EDITOR: '/responsables',
          PRODUCTOS_EDITOR: '/productos',
        };

        // Toma el PRIMER rol (en el orden que venga) que tenga ruta
        const firstRoleWithRoute = roles.find((r) => !!roleHome[r]);

        if (firstRoleWithRoute) {
          this.router.navigateByUrl(roleHome[firstRoleWithRoute]);
          return;
        }

        this.router.navigateByUrl('/unauthorized');
      },

      error: (err) => {
        this.isSubmitting.set(false);
        this.loginError = err?.error?.message || 'Error al iniciar sesión. Verifica tus datos.';
      },
    });
  }

  showFieldError(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}