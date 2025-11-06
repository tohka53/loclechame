import { Injectable } from '@angular/core';
import { Session } from '../models';
const LS_KEY = 'loclechame_session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private session: Session | null = null;

  constructor() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) this.session = JSON.parse(raw);
  }

  /** Crea token JWT falso aleatorio */
  private generateFakeJWT(idUsuario: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: idUsuario,
      iat: Date.now(),
      exp: Date.now() + 3600 * 1000, // expira en 1h
      rnd: Math.random().toString(36).substring(2)
    }));
    const signature = btoa(Math.random().toString(36).substring(2) + Date.now());
    return `${header}.${payload}.${signature}`;
  }

  /** Establece sesión con token automático */
  setSession(sess: Session) {
    const token = this.generateFakeJWT(sess.id_usuario || 'anon');
    this.session = { ...sess, token_jwt: token };
    localStorage.setItem(LS_KEY, JSON.stringify(this.session));
  }

  clearSession() {
    this.session = null;
    localStorage.removeItem(LS_KEY);
  }

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

  /** Utilidad para iniciar sesión rápida (mock) */
  loginMock(usuario: string) {
  const randomToken = Math.random().toString(36).substring(2) + 
                      Math.random().toString(36).substring(2);
  const sess = {
    id_usuario: usuario,
    id_sesion: Math.floor(Math.random() * 100000),
    token_jwt: randomToken,
  };
  this.setSession(sess);
}


  finalizarSesion() {
    this.clearSession();
    window.location.href = '/login';
  }
}
