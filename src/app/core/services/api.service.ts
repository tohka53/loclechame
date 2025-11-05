import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiResponse } from '../models';

// Estructuras mock guardadas en localStorage
const LS = {
  SESSION: 'mock_session',
  LECTOR: 'mock_lector',
  LOCALIZADOR: 'mock_localizador',
  PREDIOS: 'mock_predios',
  CONDUCTORES: 'mock_conductores',
};

function readLS<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function writeLS(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor() {
    // Seed mínimo de catálogos si no existen
    if (!localStorage.getItem(LS.PREDIOS)) {
      writeLS(LS.PREDIOS, [
        { id_predio: 1, nombre_predio: 'Predio Central' },
        { id_predio: 2, nombre_predio: 'Depósito Norte' },
      ]);
    }
    if (!localStorage.getItem(LS.CONDUCTORES)) {
      writeLS(LS.CONDUCTORES, [
        { id_conductor: 1, nombre: 'Juan', apellido: 'Pérez' },
        { id_conductor: 2, nombre: 'María', apellido: 'Gómez' },
      ]);
    }
    if (!localStorage.getItem(LS.LECTOR)) writeLS(LS.LECTOR, []);
    if (!localStorage.getItem(LS.LOCALIZADOR)) writeLS(LS.LOCALIZADOR, []);
  }

  // Simula POST
  post<T=any>(url: string, body: any): Observable<ApiResponse<T>> {
    switch (url) {
      case '/sessions/start': {
        const sess = {
          id_sesion: Math.floor(Math.random() * 1000000),
          token_jwt: body?.token_jwt || 'fake.jwt.token',
          id_usuario: body?.id_usuario || 'user@test'
        };
        writeLS(LS.SESSION, sess);
        return of({ ok: true, data: sess as any }).pipe(delay(300));
      }
      case '/sessions/end': {
        localStorage.removeItem(LS.SESSION);
        return of({ ok: true } as ApiResponse<T>).pipe(delay(150));
      }
      case '/lector': {
        const list = readLS<any[]>(LS.LECTOR, []);
        const row = { id_lector: list.length + 1, fecha_registro: new Date().toISOString(), ...body };
        list.push(row);
        writeLS(LS.LECTOR, list);
        return of({ ok: true, data: row as any }).pipe(delay(200));
      }
      case '/localizador': {
        const list = readLS<any[]>(LS.LOCALIZADOR, []);
        const row = { id_localizador: list.length + 1, fecha_registro: new Date().toISOString(), ...body };
        list.push(row);
        writeLS(LS.LOCALIZADOR, list);
        return of({ ok: true, data: row as any }).pipe(delay(200));
      }
      default:
        return of({ ok: false, message: `Ruta POST mock no implementada: ${url}` } as ApiResponse<T>).pipe(delay(50));
    }
  }

  // Simula GET
  get<T=any>(url: string): Observable<ApiResponse<T>> {
    switch (url) {
      case '/catalogos/predios': {
        const data = readLS<any[]>(LS.PREDIOS, []);
        return of({ ok: true, data } as ApiResponse<T>).pipe(delay(150));
      }
      case '/catalogos/conductores': {
        const data = readLS<any[]>(LS.CONDUCTORES, []);
        return of({ ok: true, data } as ApiResponse<T>).pipe(delay(150));
      }
      case '/lector': {
        const data = readLS<any[]>(LS.LECTOR, []);
        return of({ ok: true, data } as ApiResponse<T>).pipe(delay(100));
      }
      case '/localizador': {
        const data = readLS<any[]>(LS.LOCALIZADOR, []);
        return of({ ok: true, data } as ApiResponse<T>).pipe(delay(100));
      }
      default:
        return of({ ok: false, message: `Ruta GET mock no implementada: ${url}` } as ApiResponse<T>).pipe(delay(50));
    }
  }
}
