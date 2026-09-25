import { CommonModule } from '@angular/common';

import {
  Component,
  signal,
} from '@angular/core';

import {
  PageTab,
  PageTabsComponent,
} from '../../shared/ui/page-tabs/page-tabs';

import {
  ProjectAllReport,
} from './components/project-all-report/project-all-report';

import {
  ProjectClassificationReport,
} from './components/project-classification-report/project-classification-report';


type ReportsSection =
  | 'project_all'
  | 'project_classification';


@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule,
    PageTabsComponent,

    ProjectAllReport,
    ProjectClassificationReport,
  ],

  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {

  readonly activeSection =
    signal<ReportsSection>(
      'project_all',
    );


  readonly tabs:
    PageTab[] = [

      {
        id:
          'project_all',

        icon:
          'assessment',

        label:
          'Reporte de proyecto',

        description:
          'Resumen financiero consolidado del proyecto',
      },

      {
        id:
          'project_classification',

        icon:
          'category',

        label:
          'Clasificación de gastos',

        description:
          'Gastos agrupados por clasificación homologada',
      },

    ];


  onActiveTabChange(
    nextId: string,
  ): void {

    if (
      nextId !==
        'project_all' &&
      nextId !==
        'project_classification'
    ) {
      return;
    }


    this.activeSection.set(
      nextId,
    );

  }

}