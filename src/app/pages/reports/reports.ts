import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PageTabsComponent } from '../../shared/ui/page-tabs/page-tabs';
import { DialogService } from '../../shared/services/dialog.service';
import { confirmPendingTabChange } from '../../shared/customs/confirm-pending-tab-change';
export interface PageTab {
  id: string;
  icon: string;
  label: string;
  description?: string;
}

type HomeSection = 'banners' | 'highlights' | 'faq';

@Component({
  selector: 'app-reports',
  standalone : true,
  imports: [CommonModule, PageTabsComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
    private readonly dialog = inject(DialogService);

    activeSection = signal<HomeSection>('banners');

  tabs: PageTab[] = [
    { id: 'banners', icon: 'image', label: 'Banners mensuales', description: '2 banners principales en la parte superior' },
    { id: 'highlights', icon: 'star', label: 'Destacados del mes', description: 'Tarjetas con imagen y título' },
    { id: 'faq', icon: 'help', label: 'Preguntas frecuentes', description: 'FAQ + preguntas de usuarios' },
  ];

  //   private getActiveChild() {
  //   switch (this.activeSection()) {
  //     case 'banners': return this.bannersCmp ?? null;
  //     case 'highlights': return this.highlightsCmp ?? null;
  //     case 'faq': return this.faqCmp ?? null;
  //     default: return null;
  //   }
  // }

    onActiveTabChange(nextId: string) {
    const next = nextId as HomeSection;
    if (next === this.activeSection()) return;

    // const child = this.getActiveChild();

    confirmPendingTabChange({
      dialog: this.dialog,
      // hasPending: () => !!child?.hasPendingChanges?.(),
      apply: () => this.activeSection.set(next),
      message: 'Tienes cambios sin guardar en esta sección. ¿Cambiar de pestaña de todos modos?',
      confirmText: 'Cambiar sin guardar',
      cancelText: 'Cancelar',
    }).subscribe();
  }
}
