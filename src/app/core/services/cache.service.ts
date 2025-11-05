import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CacheService {
  set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  remove(key: string) {
    localStorage.removeItem(key);
  }
}
