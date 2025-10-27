import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavigationService } from '../navigation.service';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatListModule, MatExpansionModule, MatSidenav],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements  OnInit {
  modules: Module[] | any = [];
  activeModule: Module | null | any = null;
  activeSubModule: SubModule | null = null;
  isSidebarOpen = true; // controla abierto/cerrado
  expandedSections: { [key: string]: boolean } = {};

  constructor(private navigationService: NavigationService, private router: Router) {}

  ngOnInit() {
    this.modules = this.navigationService.getModules();
    // Si quieres persistir último módulo seleccionado:
    // const last = localStorage.getItem('activeModule');
    // if (last) this.navigationService.setActiveModule(last);
    this.navigationService.activeModule$.subscribe(m => {
      this.activeModule = m;
    });
  }

  selectModule(module: Module) {
    if (module.subModules?.length) {
      this.activeModule = module;
      this.activeSubModule = null;
    } else {
      this.router.navigateByUrl(module.route!);
    }
  }

  selectSubModule(sub: SubModule) {
    // ahora solo despliega internamente, NO navegues entre pantallas
    // si quieres navegar al primer item o ruta del submodule: router.navigateByUrl(...)
    this.activeSubModule = sub;
  }

  returnToMainMenu() { this.activeModule = null; this.activeSubModule = null; }
  returnToSubModules() { this.activeSubModule = null; }

  goToUrl(route: string) { this.router.navigateByUrl(route); }

  // toggleSidebar() { this.isSidebarOpen = !this.isSidebarOpen; }

    toggleSidebar() {
  this.isSidebarOpen = !this.isSidebarOpen;
}
}