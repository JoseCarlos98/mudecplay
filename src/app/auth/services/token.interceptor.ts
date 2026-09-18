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

import {
  Observable,
  catchError,
  tap,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';

import { AuthService } from './auth.service';


@Injectable()
export class AuthInterceptor
  implements HttpInterceptor {

  private readonly snackBar =
    inject(MatSnackBar);

  private readonly auth =
    inject(AuthService);


  private isHandlingUnauthorized =
    false;

  private isHandlingScheduleRestriction =
    false;


  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {

    const apiBase =
      (environment.apiUrl || '')
        .replace(/\/+$/, '');

    const isOurApi =
      !!apiBase &&
      req.url.startsWith(apiBase);

    const isPresignedAws =
      req.url.includes('amazonaws.com') ||
      req.url.includes('cloudfront.net') ||
      req.url.includes('X-Amz-Algorithm');

    const isLoginEndpoint =
      !!apiBase &&
      req.url === `${apiBase}/auth/login`;


    // =========================================================
    // NO INTERCEPTAR SERVICIOS EXTERNOS / AWS
    // =========================================================

    if (
      !isOurApi ||
      isPresignedAws
    ) {

      return next.handle(req);
    }


    // =========================================================
    // TOKEN
    // =========================================================

    const token =
      this.auth.getToken();

    const authReq =
      token
        ? req.clone({
            setHeaders: {
              Authorization:
                `Bearer ${token}`,
            },
          })
        : req;


    // =========================================================
    // REQUEST
    // =========================================================

    return next.handle(authReq).pipe(

      // =======================================================
      // RESPUESTAS EXITOSAS
      // =======================================================

      tap((event) => {

        if (
          !(event instanceof HttpResponse)
        ) {
          return;
        }


        const body =
          event.body as {
            success?: boolean;
            message?: string;
          } | null;


        /*
         * Solo mostramos snackbar automático
         * cuando backend indica success: true.
         */
        if (
          !body?.success
        ) {
          return;
        }


        let fallbackMessage =
          '';


        switch (req.method) {

          case 'POST':

            fallbackMessage =
              'Registro creado correctamente.';

            break;


          case 'PATCH':

          case 'PUT':

            fallbackMessage =
              'Registro actualizado correctamente.';

            break;


          case 'DELETE':

            fallbackMessage =
              'Registro eliminado correctamente.';

            break;
        }


        /*
         * No mostramos snackbar si no existe
         * mensaje ni fallback para el método.
         */
        const message =
          body.message ??
          fallbackMessage;


        if (
          !message
        ) {
          return;
        }


        this.snackBar.open(
          message,
          '',
          {
            horizontalPosition:
              'end',

            verticalPosition:
              'top',

            duration:
              3000,

            panelClass: [
              'snackbar-success',
            ],
          },
        );
      }),


      // =======================================================
      // ERRORES
      // =======================================================

      catchError(
        (
          error:
            HttpErrorResponse,
        ) => {

          const errorCode =
            error.error?.code;


          // ===================================================
          // RESTRICCIÓN DE HORARIO
          // ===================================================

          const isScheduleRestriction =
            error.status === 403 &&
            errorCode ===
              'WORK_SCHEDULE_ACCESS_DENIED';


          if (
            isScheduleRestriction
          ) {

            this.handleScheduleRestriction(
              error,
              isLoginEndpoint,
            );

            return throwError(
              () => error,
            );
          }


          // ===================================================
          // SESIÓN EXPIRADA / NO AUTORIZADO
          // ===================================================

          if (
            error.status === 401 &&
            !isLoginEndpoint &&
            !this.isHandlingUnauthorized
          ) {

            this.handleUnauthorized();

            return throwError(
              () => error,
            );
          }


          // ===================================================
          // SIN PERMISOS
          // ===================================================

          if (
            error.status === 403
          ) {

            this.showPermissionDeniedMessage();

            return throwError(
              () => error,
            );
          }


          // ===================================================
          // ERROR NORMAL DE NEGOCIO / VALIDACIÓN
          // ===================================================
          /*
           * Ejemplos:
           *
           * 400 Bad Request
           * 404 Not Found
           * 409 Conflict
           * 500 Internal Server Error
           *
           * Utiliza primero el message que manda NestJS.
           *
           * En login no lo mostramos porque LoginComponent
           * ya administra el mensaje dentro del formulario.
           */

          if (
            !isLoginEndpoint
          ) {

            this.showApiErrorMessage(
              error,
            );
          }


          return throwError(
            () => error,
          );
        },
      ),
    );
  }


  // =========================================================
  // RESTRICCIÓN DE HORARIO
  // =========================================================

  private handleScheduleRestriction(
    error:
      HttpErrorResponse,

    isLoginEndpoint:
      boolean,
  ): void {

    /*
     * Durante el login no mostramos snackbar
     * ni ejecutamos logout.
     *
     * LoginComponent ya mostrará
     * error.error.message dentro del formulario.
     */

    if (
      isLoginEndpoint ||
      this.isHandlingScheduleRestriction
    ) {
      return;
    }


    this.isHandlingScheduleRestriction =
      true;


    const message =
      error.error?.message ??
      'Tu acceso se encuentra fuera del horario laboral permitido.';


    this.snackBar.open(
      message,
      '',
      {
        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        duration:
          6000,

        panelClass: [
          'snackbar-error',
        ],
      },
    );


    this.auth.logout();


    setTimeout(
      () => {

        this.isHandlingScheduleRestriction =
          false;
      },
      1000,
    );
  }


  // =========================================================
  // 401
  // =========================================================

  private handleUnauthorized():
    void {

    this.isHandlingUnauthorized =
      true;


    this.auth.logout();


    setTimeout(
      () => {

        this.isHandlingUnauthorized =
          false;
      },
      0,
    );
  }


  // =========================================================
  // 403
  // =========================================================

  private showPermissionDeniedMessage():
    void {

    this.snackBar.open(
      'No tienes permisos para realizar esta acción.',
      '',
      {
        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        duration:
          3500,

        panelClass: [
          'snackbar-error',
        ],
      },
    );
  }


  // =========================================================
  // ERRORES API
  // =========================================================

  private showApiErrorMessage(
    error:
      HttpErrorResponse,
  ): void {

    const backendMessage =
      error.error?.message;


    /*
     * class-validator de NestJS puede regresar:
     *
     * message: "..."
     *
     * o
     *
     * message: ["...", "..."]
     */
    const message =
      Array.isArray(
        backendMessage,
      )
        ? backendMessage.join(' ')
        : typeof backendMessage ===
            'string' &&
          backendMessage.trim()
          ? backendMessage
          : 'Ocurrió un error al procesar la solicitud.';


    this.snackBar.open(
      message,
      '',
      {
        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        duration:
          6000,

        panelClass: [
          'snackbar-error',
        ],
      },
    );
  }
}