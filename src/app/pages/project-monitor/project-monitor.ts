import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  finalize,
} from 'rxjs';


// ======================================================
// UI COMPARTIDOS
// ======================================================

import {
  ModuleHeader,
} from '../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../shared/ui/module-header/interfaces/module-header-interface';


// ======================================================
// SERVICIOS
// ======================================================

import {
  ProjectMonitorService,
} from './services/project-monitor.service';


// ======================================================
// INTERFACES
// ======================================================

import {
  ProjectMonitorResponse,
} from './interfaces/project-monitor.interfaces';


// ======================================================
// CONSTANTES
// ======================================================

const REFRESH_INTERVAL_MS =
  60_000;


const HEADER_CONFIG:
  ModuleHeaderConfig = {

  showNew:
    false,

};


@Component({
  selector:
    'app-project-monitor',

  standalone:
    true,

  imports: [
    CommonModule,

    ModuleHeader,

    MatIconModule,
  ],

  templateUrl:
    './project-monitor.html',

  styleUrl:
    './project-monitor.scss',
})
export class ProjectMonitor
  implements OnInit, OnDestroy {

  // ======================================================
  // INYECCIONES
  // ======================================================

  private readonly monitorService =
    inject(ProjectMonitorService);


  // ======================================================
  // CONFIG UI
  // ======================================================

  readonly headerConfig =
    HEADER_CONFIG;


  // ======================================================
  // ESTADO
  // ======================================================

  readonly monitor =
    signal<ProjectMonitorResponse | null>(
      null,
    );


  readonly loading =
    signal<boolean>(
      false,
    );


  readonly error =
    signal<string | null>(
      null,
    );


  private refreshTimer:
    ReturnType<typeof setTimeout> |
    null =
    null;


  // ======================================================
  // CICLO DE VIDA
  // ======================================================

  ngOnInit(): void {

    this.loadMonitor();

  }


  ngOnDestroy(): void {

    this.clearRefreshTimer();

  }


  // ======================================================
  // CARGAR MONITOR
  // ======================================================

  loadMonitor(
    manual = false,
  ): void {

    /*
     * Evitamos peticiones simultáneas.
     */
    if (
      this.loading()
    ) {

      return;

    }


    /*
     * Si el usuario presiona
     * "Actualizar ahora",
     * reiniciamos el contador.
     */
    if (
      manual
    ) {

      this.clearRefreshTimer();

    }


    this.loading.set(
      true,
    );


    this.error.set(
      null,
    );


    this.monitorService
      .getMonitor()
      .pipe(

        finalize(
          () => {

            this.loading.set(
              false,
            );


            /*
             * El minuto comienza a contar
             * después de terminar la petición.
             */
            this.scheduleNextRefresh();

          },
        ),

      )
      .subscribe({

        next: (
          response,
        ) => {

          this.monitor.set(
            response,
          );

        },


        error: (
          err,
        ) => {

          console.error(
            '[PROJECT MONITOR] Error al actualizar monitor:',
            err,
          );


          /*
           * Conservamos los últimos datos válidos.
           */
          this.error.set(
            'No se pudo actualizar la información del monitor.',
          );

        },

      });

  }


  // ======================================================
  // ACTUALIZAR AHORA
  // ======================================================

  refreshNow(): void {

    this.loadMonitor(
      true,
    );

  }


  // ======================================================
  // TIMER
  // ======================================================

  private scheduleNextRefresh(): void {

    this.clearRefreshTimer();


    this.refreshTimer =
      setTimeout(
        () => {

          this.loadMonitor();

        },
        REFRESH_INTERVAL_MS,
      );

  }


  private clearRefreshTimer(): void {

    if (
      !this.refreshTimer
    ) {

      return;

    }


    clearTimeout(
      this.refreshTimer,
    );


    this.refreshTimer =
      null;

  }

}