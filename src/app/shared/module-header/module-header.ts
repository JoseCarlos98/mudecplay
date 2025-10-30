import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-module-header',
  imports: [CommonModule, MatIcon],
  templateUrl: './module-header.html',
  styleUrl: './module-header.scss',
})
export class ModuleHeader {
  @Input() title: string = '';
  @Input() icon: string = 'dashboard';
  @Input() showNew: boolean = false;
  @Input() showUploadXml: boolean = false;
  @Input() extraButtons: { icon: string; label: string; action: string }[] = [];

  @Output() download = new EventEmitter<void>();
  @Output() uploadXml = new EventEmitter<void>();
  @Output() customAction = new EventEmitter<string>();

  onDescargar() {
    console.log('Descargando...');
  }

  onCargarXml() {
    console.log('Subiendo XML...');
  }

  onHeaderAction(action: string) {
    console.log('Acción:', action);
  }

}
