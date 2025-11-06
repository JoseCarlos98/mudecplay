
import { inject, Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private snackBar = inject(MatSnackBar);

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = localStorage.getItem('token');

        // si no hay token, la request pasa tal cual
        // if (!token) return next.handle(req);

        const authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Pasar la request modificada al siguiente interceptor o al servidor
        return next.handle(authReq).pipe(
            tap((event) => {
                if (event instanceof HttpResponse) {
                    const body = event.body;

                    if (body?.success) {
                        let fallbackMsg: string = '';

                        switch (req.method) {
                            case 'POST':
                                fallbackMsg = 'Registro creado correctamente.';
                                break;
                            case 'PUT':
                            case 'PATCH':
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
                            panelClass: body.success ? ['snackbar-success'] : ['snackbar-error'],
                        });
                    }
                }
            })
        );
    }
}


