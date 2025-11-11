// src/app/core/services/session.service.ts
import { Injectable } from '@angular/core';
import { OfflineQueueService } from './offline-queue.service';
import { CacheService } from './cache.service';

// ——— Ajusta si prefieres importar la interfaz desde models ———
// (Estructuralmente compatible con la que tienes en core/models)
export interface Session {
  id_usuario: string;
  id_sesion: number;
  token_jwt: string;
}

const LS_KEY = 'loclechame_session';
const APP_PREFIX = 'loclechame_';
const AREA_INFO_KEY = 'lector_area_info_v1';

// Si usas datos de mock sin prefijo, puedes listarlos aquí:
const MOCK_KEYS = [
  'mock_session',
  'mock_lector',
  'mock_localizador',
  'mock_predios',
  'mock_conductores',
];

type JwtBody = { exp?: number };

function decodeJwt(t: string): JwtBody | null {
  try {
    const p = t.split('.')[1];
    const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private session: Session | null = null;

  constructor(
    private offq: OfflineQueueService,
    private cache: CacheService
  ) {
    // 🔁 Restaura la sesión al arrancar la app
    this.restore();
  }

  /** Guarda una sesión REAL (respuesta de backend) */
  begin(sess: Session) {
    this.session = sess;
    localStorage.setItem(LS_KEY, JSON.stringify(sess));

    // ✅ Cada nueva sesión debe pedir de nuevo Área/Usuario en el lector
    this.cache.remove(AREA_INFO_KEY);
  }

  /** Alias por si en algún sitio llamas set() */
  set(sess: Session) {
    this.begin(sess);
  }

  /** Login de desarrollo con JWT simulado (corrige TS2339) */
  loginMock(id_usuario: string) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 8 * 60 * 60; // 8 horas
    const payload = btoa(JSON.stringify({ sub: id_usuario, iat, exp }));
    const token = `mock.${payload}.sig`;

    const sess: Session = {
      id_usuario,
      id_sesion: Math.floor(100000 + Math.random() * 900000),
      token_jwt: token,
    };

    this.begin(sess);
  }

  /** Intenta restaurar una sesión persistida y valida exp si existe */
  restore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;

      const sess = JSON.parse(raw) as Session;

      const payload = decodeJwt(sess.token_jwt);
      const expMs = payload?.exp ? payload.exp * 1000 : null;
      if (expMs && Date.now() > expMs) {
        // Token expirado → limpiar y salir
        this.clearSession();
        return;
      }

      this.session = sess; // ✅ Sesión válida restaurada
    } catch {
      // Si falló el parseo, limpia por seguridad
      this.clearSession();
    }
  }

  /** Borra solo la sesión persistida (no más datos) */
  clearSession() {
    this.session = null;
    localStorage.removeItem(LS_KEY);
  }

  /** Cierre de sesión completo */
  finalizarSesion() {
    this.clearSession();

    // Limpia colas offline (lecturas/localizador en espera)
    this.offq.clearQueues();

    // (Opcional) Limpia todo lo de la app por prefijo:
    // this.cache.clearByPrefix(APP_PREFIX);

    // (Opcional) Limpia llaves mock si las usas sin prefijo
    // MOCK_KEYS.forEach(k => localStorage.removeItem(k));

    // (Opcional) Limpia también el área/usuario del lector
    // this.cache.remove(AREA_INFO_KEY);

    // Redirige al login
    window.location.href = '/login';
  }

  // ——— Getters de conveniencia usados en componentes/guards ———
  isActive(): boolean {
    return !!this.session?.token_jwt && !!this.session?.id_sesion;
  }

  getToken(): string | null {
    return this.session?.token_jwt ?? null;
  }

  getIdSesion(): number | null {
    return this.session?.id_sesion ?? null;
  }

  getUsuario(): string | null {
    return this.session?.id_usuario ?? null;
  }
}
