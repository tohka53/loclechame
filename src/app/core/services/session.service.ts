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
  setSession(sess: Session) {
    this.session = sess;
    localStorage.setItem(LS_KEY, JSON.stringify(sess));
  }
  clearSession() {
    this.session = null;
    localStorage.removeItem(LS_KEY);
  }
  isActive(): boolean { return !!this.session?.token_jwt && !!this.session?.id_sesion; }
  getToken(): string | null { return this.session?.token_jwt ?? null; }
  getIdSesion(): number | null { return this.session?.id_sesion ?? null; }
  getUsuario(): string | null { return this.session?.id_usuario ?? null; }
}
