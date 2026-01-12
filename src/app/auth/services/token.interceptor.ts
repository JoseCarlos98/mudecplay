import { inject, Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    const authReq = token
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req;

    return next.handle(authReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          const body = event.body;

          // Tu patrón: endpoints regresan { success, message }
          if (body?.success) {
            let fallbackMsg = '';

            switch (req.method) {
              case 'POST':
                fallbackMsg = 'Registro creado correctamente.';
                break;
              case 'PATCH':
              case 'PUT':
                fallbackMsg = 'Registro actualizado correctamente.';
                break;
              case 'DELETE':
                fallbackMsg = 'Registro eliminado correctamente.';
                break;
            }

            this.snackBar.open(body.message ?? fallbackMsg, '', {
              horizontalPosition: 'end',
              verticalPosition: 'top',
              duration: 3000,
              panelClass: ['snackbar-success'],
            });
          }
        }
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // token inválido/expirado
          this.auth.logout();
        } else if (err.status === 403) {
          this.snackBar.open('No tienes permisos para realizar esta acción.', '', {
            horizontalPosition: 'end',
            verticalPosition: 'top',
            duration: 3500,
            panelClass: ['snackbar-error'],
          });
        }

        return throwError(() => err);
      }),
    );
  }
}
