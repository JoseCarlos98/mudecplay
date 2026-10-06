import {
  CommonModule,
} from '@angular/common';

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

import {
  ExpenseAnalysis,
} from './components/expense-analysis/expense-analysis';


type ReportsSection =
  | 'project_all'
  | 'project_classification'
  | 'expense_analysis';


@Component({
  selector:
    'app-reports',

  standalone:
    true,

  imports: [
    CommonModule,
    PageTabsComponent,

    ProjectAllReport,
    ProjectClassificationReport,
    ExpenseAnalysis,
  ],

  templateUrl:
    './reports.html',

  styleUrl:
    './reports.scss',
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

      {
        id:
          'expense_analysis',

        icon:
          'query_stats',

        label:
          'Análisis de gastos',

        description:
          'Consulta dinámica de gastos, saldos y compromisos',
      },

    ];


  onActiveTabChange(
    nextId:
      string,
  ):
    void {

    if (
      nextId !==
        'project_all' &&
      nextId !==
        'project_classification' &&
      nextId !==
        'expense_analysis'
    ) {

      return;
    }


    this.activeSection.set(
      nextId,
    );
  }
}