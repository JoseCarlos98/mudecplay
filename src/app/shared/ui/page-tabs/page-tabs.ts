import { Component, EventEmitter, Input, OnChanges, SimpleChanges, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface PageTab {
  id: string;
  icon: string;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-page-tabs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './page-tabs.html',
  styleUrl: './page-tabs.scss',
})
export class PageTabsComponent implements OnChanges {
  @Input() title = '';
  @Input() description = '';
  @Input() tabs: PageTab[] = [];

  /** El padre controla este valor. El hijo NO lo muta. */
  @Input() activeTab: string | null = null;

  /** El hijo solo emite la intención de cambiar. */
  @Output() activeTabChange = new EventEmitter<string>();

  // estado de animación del contenido
  contentState = signal<'visible' | 'hidden'>('visible');

  /** El hijo NO cambia activeTab. Solo emite el intento. */
  onTabClick(tabId: string) {
    if (tabId === this.activeTab) return;
    this.activeTabChange.emit(tabId);
  }

  /** Reacciona cuando el padre realmente cambia el input (confirmado). */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeTab'] && !changes['activeTab'].firstChange) {
      // dispara animación solo cuando cambió el input controlado
      this.contentState.set('hidden');
      setTimeout(() => this.contentState.set('visible'), 50);
    }
  }
}
