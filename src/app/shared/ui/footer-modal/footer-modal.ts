import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-sections-btns',
  imports: [CommonModule, MatIconModule],
  templateUrl: './footer-modal.html',
  styleUrl: './footer-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterModal {
  @Input() btnSave: boolean = false;
  @Input() modal: boolean = false;
  @Input() hasActiveFilters: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveData = new EventEmitter<void>();
  @Output() searchWithFilters = new EventEmitter<void>();
  @Output() clearAllAndSearch = new EventEmitter<void>();
}
