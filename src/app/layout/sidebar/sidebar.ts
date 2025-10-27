import { Component, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavigationService } from '../navigation.service';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule, MatToolbarModule, MatIconModule, MatListModule, MatExpansionModule, MatSidenavModule],

  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnChanges {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @Input() isSidebarOpen = true;
  modules: Module[] | any = [];
  activeModule: Module | null | any = null;
  activeSubModule: SubModule | null = null;
  expandedSections: { [key: string]: boolean } = {};

  constructor(private navigationService: NavigationService, private router: Router) { }

  ngOnInit() {
    this.modules = this.navigationService.getModules();
    this.navigationService.activeModule$.subscribe(m => {
      this.activeModule = m;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isSidebarOpen'] && this.sidenav) {
      if (this.isSidebarOpen) {
        this.sidenav.toggle();
      } else {
        this.sidenav.close();
      }
    }
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
    this.activeSubModule = sub;
  }

  returnToMainMenu() { this.activeModule = null; this.activeSubModule = null; }
  returnToSubModules() { this.activeSubModule = null; }

  goToUrl(route: string) { this.router.navigateByUrl(route); }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}