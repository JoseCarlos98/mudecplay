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


type ReportsSection =
  'project_all';


@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule,
    PageTabsComponent,
    ProjectAllReport,
  ],

  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {

  readonly activeSection =
    signal<ReportsSection>(
      'project_all',
    );


  readonly tabs: PageTab[] = [
    {
      id: 'project_all',
      icon: 'assessment',
      label: 'Reporte de proyecto',
      description:
        'Resumen financiero consolidado del proyecto',
    },
  ];


  onActiveTabChange(
    nextId: string,
  ): void {

    if (
      nextId !==
      'project_all'
    ) {
      return;
    }

    this.activeSection.set(
      'project_all',
    );

  }

}