import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Acciones disponibles en el header
export type ModuleHeaderAction =
  | 'new'
  | 'upload'
  | 'download'
  | 'close'
  | 'custom';

// Botón adicional configurable
export interface ExtraButton {
  icon: string;
  label: string;
  action: string;
}

// Config general del header
export interface ModuleHeaderConfig {
  modal?: boolean;
  showNew?: boolean;
  showUploadXml?: boolean;
  showDownload?: boolean;
}

@Component({
  selector: 'app-module-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatTooltipModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './module-header.html',
  styleUrl: './module-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleHeader {
  /** Título mostrado en el header */
  @Input() title: string = '';

  /** Configuración visual y funcional */
  @Input() config: ModuleHeaderConfig = {};

  /** Botones adicionales personalizados */
  @Input() extraButtons: ExtraButton[] = [];

  /** Evento único para todas las acciones del header */
  @Output() action = new EventEmitter<ModuleHeaderAction | string>();

  /** Emite acción estándar */
  emit(action: ModuleHeaderAction | string): void {
    this.action.emit(action);
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    console.log(this.title);

  }
}
