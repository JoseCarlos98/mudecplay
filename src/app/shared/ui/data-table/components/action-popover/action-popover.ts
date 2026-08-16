import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  signal,
} from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';

export type ActionPopoverKind = 'warning' | 'info' | 'success' | 'error';

@Component({
  selector: 'app-action-popover',
  standalone: true,
  imports: [
    CommonModule,
    OverlayModule,
    MatIconModule,
  ],
  templateUrl: './action-popover.html',
  styleUrl: './action-popover.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionPopover implements OnDestroy {
  @Input() title = '';
  @Input() message: string | null = null;
  @Input() items: string[] = [];
  @Input() kind: ActionPopoverKind = 'warning';

  /**
   * Si en algún uso quieres desactivar totalmente el popover.
   */
  @Input() disabled = false;

  readonly opened = signal(false);

  readonly positions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: 12,
    },
    {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -12,
    },
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
      offsetX: 12,
    },
    {
      originX: 'start',
      originY: 'center',
      overlayX: 'end',
      overlayY: 'center',
      offsetX: -12,
    },
  ];

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  get hasContent(): boolean {
    return !!this.title?.trim()
      || !!this.message?.trim()
      || (this.items?.length ?? 0) > 0;
  }

  get iconName(): string {
    switch (this.kind) {
      case 'info':
        return 'info';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error_outline';
      case 'warning':
      default:
        return 'warning_amber';
    }
  }

  open(): void {
    if (this.disabled || !this.hasContent) return;

    this.clearCloseTimer();
    this.opened.set(true);
  }

  scheduleClose(): void {
    this.clearCloseTimer();

    this.closeTimer = setTimeout(() => {
      this.opened.set(false);
    }, 120);
  }

  closeNow(): void {
    this.clearCloseTimer();
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) {
      this.closeNow();
      return;
    }

    this.open();
  }

  private clearCloseTimer(): void {
    if (!this.closeTimer) return;

    clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  ngOnDestroy(): void {
    this.clearCloseTimer();
  }
}