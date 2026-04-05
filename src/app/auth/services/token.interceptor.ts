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
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  private isHandlingUnauthorized = false;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiBase = (environment.apiUrl || '').replace(/\/+$/, '');
    const isOurApi = !!apiBase && req.url.startsWith(apiBase);

    const isPresignedAws =
      req.url.includes('amazonaws.com') ||
      req.url.includes('cloudfront.net') ||
      req.url.includes('X-Amz-Algorithm');

    const isLoginEndpoint = !!apiBase && req.url === `${apiBase}/auth/login`;

    // No agregar token a requests externas o presigned URLs
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
        if (event instanceof HttpResponse) {
          const body = event.body as any;

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
        if (err.status === 401 && !isLoginEndpoint && !this.isHandlingUnauthorized) {
          this.isHandlingUnauthorized = true;
          this.auth.logout();
          setTimeout(() => {
            this.isHandlingUnauthorized = false;
          }, 0);
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