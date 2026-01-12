import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { PermissionsService } from '../services/permissions.service';
import { AuthService } from '../services/auth.service';
import { RoleCode } from '../interfaces/auth.interface';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private tpl = inject(TemplateRef<any>);
  private vcr = inject(ViewContainerRef);
  private perms = inject(PermissionsService);
  private auth = inject(AuthService);

  private required: RoleCode | RoleCode[] | null = null;
  private rendered = false;

  @Input()
  set hasRole(value: RoleCode | RoleCode[]) {
    this.required = value;
    this.update();
  }

  constructor() {
    // Re-evalúa cuando cambie el usuario (login/logout/refresh)
    effect(() => {
      this.auth.currentUser(); // tracking
      this.update();
    });
  }

  private update() {
    const req = this.required;

    const allowed =
      req == null
        ? true
        : Array.isArray(req)
          ? this.perms.hasAnyRole(req)
          : this.perms.hasRole(req);

    if (allowed && !this.rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.vcr.clear();
      this.rendered = false;
    }
  }
}
