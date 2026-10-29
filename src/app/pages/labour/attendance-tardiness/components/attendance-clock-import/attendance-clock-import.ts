import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: false,
  showUploadXml: false,
};

@Component({
  selector: 'app-attendance-clock-import',
  standalone: true,
  imports: [ModuleHeader],
  templateUrl: './attendance-clock-import.html',
})
export class AttendanceClockImport {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly headerConfig = HEADER_CONFIG;

  goBack(): void {
    // Ambas pantallas son rutas hermanas dentro de LABOUR_ROUTES.
    void this.router.navigate(['llegadas-retardos'], {
      relativeTo: this.route.parent ?? this.route,
    });
  }
}
