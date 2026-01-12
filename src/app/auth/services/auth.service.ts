import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthUser, LoginResponse } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Cambia keys para MudecPlay
  private readonly TOKEN_KEY = 'mudecplay_token';
  private readonly USER_KEY = 'mudecplay_user';

  currentUser = signal<AuthUser | null>(null);
  isLoggedIn = computed(() => !!this.getToken() && !!this.currentUser());

  constructor() {
    const token = this.getToken();
    const storedUser = localStorage.getItem(this.USER_KEY);

    if (storedUser) {
      this.currentUser.set(JSON.parse(storedUser) as AuthUser);
      return;
    }

    if (token) {
      // Tenemos token pero no user → pedimos /auth/me
      this.me().subscribe();
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }),
      );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(() => {
        this.logout();
        return of(null as any);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // helpers roles
  hasRole(role: string): boolean {
    return (this.currentUser()?.roles ?? []).includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.currentUser()?.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  }
}
