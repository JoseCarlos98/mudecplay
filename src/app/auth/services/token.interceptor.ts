import { inject, Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  private isHandlingUnauthorized = false;
  private isHandlingScheduleRestriction = false;

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const apiBase = (environment.apiUrl || '').replace(/\/+$/, '');
    const isOurApi = !!apiBase && req.url.startsWith(apiBase);

    const isPresignedAws =
      req.url.includes('amazonaws.com') ||
      req.url.includes('cloudfront.net') ||
      req.url.includes('X-Amz-Algorithm');

    const isLoginEndpoint =
      !!apiBase && req.url === `${apiBase}/auth/login`;

    // No agregar token a servicios externos ni URLs firmadas de AWS.
    if (!isOurApi || isPresignedAws) {
      return next.handle(req);
    }

    const token = this.auth.getToken();

    const authReq = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

    return next.handle(authReq).pipe(
      tap((event) => {
        if (!(event instanceof HttpResponse)) {
          return;
        }

        const body = event.body as {
          success?: boolean;
          message?: string;
        } | null;

        if (!body?.success) {
          return;
        }

        let fallbackMessage = '';

        switch (req.method) {
          case 'POST':
            fallbackMessage = 'Registro creado correctamente.';
            break;

          case 'PATCH':
          case 'PUT':
            fallbackMessage = 'Registro actualizado correctamente.';
            break;

          case 'DELETE':
            fallbackMessage = 'Registro eliminado correctamente.';
            break;
        }

        this.snackBar.open(body.message ?? fallbackMessage, '', {
          horizontalPosition: 'end',
          verticalPosition: 'top',
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
      }),
      catchError((error: HttpErrorResponse) => {
        const errorCode = error.error?.code;
        const isScheduleRestriction =
          error.status === 403 &&
          errorCode === 'WORK_SCHEDULE_ACCESS_DENIED';

        if (isScheduleRestriction) {
          this.handleScheduleRestriction(error, isLoginEndpoint);
          return throwError(() => error);
        }

        if (
          error.status === 401 &&
          !isLoginEndpoint &&
          !this.isHandlingUnauthorized
        ) {
          this.handleUnauthorized();
          return throwError(() => error);
        }

        if (error.status === 403) {
          this.showPermissionDeniedMessage();
        }

        return throwError(() => error);
      }),
    );
  }

  private handleScheduleRestriction(
    error: HttpErrorResponse,
    isLoginEndpoint: boolean,
  ): void {
    /*
     * Durante el login no mostramos snackbar ni ejecutamos logout.
     * LoginComponent ya mostrará error.error.message dentro del formulario.
     */
    if (isLoginEndpoint || this.isHandlingScheduleRestriction) {
      return;
    }

    this.isHandlingScheduleRestriction = true;

    const message =
      error.error?.message ??
      'Tu acceso se encuentra fuera del horario laboral permitido.';

    this.snackBar.open(message, '', {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 6000,
      panelClass: ['snackbar-error'],
    });

    this.auth.logout();

    setTimeout(() => {
      this.isHandlingScheduleRestriction = false;
    }, 1000);
  }

  private handleUnauthorized(): void {
    this.isHandlingUnauthorized = true;

    this.auth.logout();

    setTimeout(() => {
      this.isHandlingUnauthorized = false;
    }, 0);
  }

  private showPermissionDeniedMessage(): void {
    this.snackBar.open(
      'No tienes permisos para realizar esta acción.',
      '',
      {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3500,
        panelClass: ['snackbar-error'],
      },
    );
  }
}