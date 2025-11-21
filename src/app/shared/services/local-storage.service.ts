import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {

  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn('[LocalStorageService] JSON inválido para key', key);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {

    console.log('typeof window', typeof window);
    
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}
