import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, input, Output, output } from '@angular/core';

@Component({
  selector: 'app-footer-modal',
  imports: [CommonModule],
  templateUrl: './footer-modal.html',
  styleUrl: './footer-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterModal {
  @Input() btnSave : boolean = false;
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() saveData = new EventEmitter<boolean>();
}
