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

  /** Flags UI (por default mantienen el comportamiento anterior) */
  @Input() compact = false;
  @Input() showHeaderDescription = true;
  @Input() showTabDescriptions = true;

  /** El hijo solo emite la intención de cambiar. */
  @Output() activeTabChange = new EventEmitter<string>();

  // estado de animación del contenido
  contentState = signal<'visible' | 'hidden'>('visible');

  onTabClick(tabId: string) {
    if (tabId === this.activeTab) return;
    this.activeTabChange.emit(tabId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeTab'] && !changes['activeTab'].firstChange) {
      this.contentState.set('hidden');
      setTimeout(() => this.contentState.set('visible'), 50);
    }
  }
}
