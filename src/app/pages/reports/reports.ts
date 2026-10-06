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

import {
  ExpenseAnalysis,
} from './components/expense-analysis/expense-analysis';


type ReportsSection =
  | 'project_all'
  | 'project_classification'
  | 'expense_analysis';


const REPORTS_ACTIVE_SECTION_KEY =
  'mudecplay.reports.active-section.v1';


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
      this.getInitialSection(),
    );


  readonly expenseAnalysisInitialized =
    signal(
      this.activeSection() ===
      'expense_analysis',
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
          'Análisis dinámico de gastos, pagos y compromisos',
      },
    ];


  onActiveTabChange(
    nextId:
      string,
  ): void {

    if (
      !this.isReportsSection(
        nextId,
      )
    ) {

      return;
    }


    if (
      nextId ===
      'expense_analysis'
    ) {

      this.expenseAnalysisInitialized.set(
        true,
      );
    }


    this.activeSection.set(
      nextId,
    );


    this.saveActiveSection(
      nextId,
    );
  }


  private getInitialSection():
    ReportsSection {

    try {

      const saved =
        localStorage.getItem(
          REPORTS_ACTIVE_SECTION_KEY,
        );


      if (
        saved &&
        this.isReportsSection(
          saved,
        )
      ) {

        return saved;
      }

    } catch (
      error
    ) {

      console.warn(
        'No se pudo restaurar la pestaña de reportes:',
        error,
      );
    }


    return 'project_all';
  }


  private saveActiveSection(
    section:
      ReportsSection,
  ): void {

    try {

      localStorage.setItem(
        REPORTS_ACTIVE_SECTION_KEY,
        section,
      );

    } catch (
      error
    ) {

      console.warn(
        'No se pudo guardar la pestaña de reportes:',
        error,
      );
    }
  }


  private isReportsSection(
    value:
      string,
  ): value is ReportsSection {

    return (
      value ===
        'project_all' ||
      value ===
        'project_classification' ||
      value ===
        'expense_analysis'
    );
  }
}