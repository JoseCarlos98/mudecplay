import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-btns-section',
  imports: [CommonModule, MatIconModule],
  templateUrl: './btns-section.html',
  styleUrl: './btns-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BtnsSection {
  @Input() btnSave: boolean = false;
  @Input() modal: boolean = false;
  @Input() hasActiveFilters: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveData = new EventEmitter<void>();
  @Output() searchWithFilters = new EventEmitter<void>();
  @Output() clearAllAndSearch = new EventEmitter<void>();
}
