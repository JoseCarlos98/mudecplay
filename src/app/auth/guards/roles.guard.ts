import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolesGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data?.['roles'] as string[] | undefined) ?? [];

  // si la ruta no pide roles, solo requiere login
  if (!requiredRoles.length) return auth.getToken() ? true : router.parseUrl('/login');

  // si no está logueado
  if (!auth.getToken()) return router.parseUrl('/login');

  // ADMIN_GENERAL pasa todo (mismo concepto que backend)
  if (auth.hasRole('ADMIN_GENERAL')) return true;

  // otros roles
  console.log(auth.hasAnyRole(requiredRoles));
  
  if (auth.hasAnyRole(requiredRoles)) return true;

  return router.parseUrl('/unauthorized'); // o a /home
};
