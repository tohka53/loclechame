import { Injectable } from '@angular/core';
import { OfflineQueueService } from './offline-queue.service';
import { CacheService } from './cache.service';

export interface Session {
  id_usuario: string;
  id_sesion: number;
  token_jwt: string;
}
const LS_KEY = 'loclechame_session';
const PREFIX = 'loclechame_';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private session: Session | null = null;

  constructor(
    private offq: OfflineQueueService,
    private cache: CacheService
  ) {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) this.session = JSON.parse(raw);
  }

  private generateFakeJWT(idUsuario: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: idUsuario, iat: Date.now(), rnd: Math.random() }));
    const signature = btoa(Math.random().toString(36).slice(2) + Date.now());
    return `${header}.${payload}.${signature}`;
  }

  setSession(sess: Session) {
    this.session = sess;
    localStorage.setItem(LS_KEY, JSON.stringify(sess));
  }

  loginMock(usuario: string) {
    const sess: Session = {
      id_usuario: usuario,
      id_sesion: Math.floor(Math.random() * 100000),
      token_jwt: this.generateFakeJWT(usuario)
    };
    this.setSession(sess);
  }

  clearSession() {
    this.session = null;
    localStorage.removeItem(LS_KEY);
  }

  isActive(): boolean { return !!this.session?.token_jwt && !!this.session?.id_sesion; }
  getToken(): string | null { return this.session?.token_jwt ?? null; }
  getIdSesion(): number | null { return this.session?.id_sesion ?? null; }
  getUsuario(): string | null { return this.session?.id_usuario ?? null; }

  /** Cerrar sesión + limpiar formularios/cache/colas */
  finalizarSesion() {
    this.clearSession();
    this.offq.clearQueues();
    // limpia formularios/estado con prefijo del app (incluye borradores)
    this.cache.clearByPrefix(PREFIX);
    // opcional: redirigir
    window.location.href = '/login';
  }
}
