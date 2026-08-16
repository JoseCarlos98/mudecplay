import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.scss',
})
export class LoadingOverlay {
  readonly visible = input<boolean>(false);
  readonly text = input<string>('Cargando...');
  readonly fullscreen = input<boolean>(false);
}