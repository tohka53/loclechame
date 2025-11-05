import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Session } from '../models';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}
  iniciarSesion(id_usuario: string, token_jwt: string): Observable<Session> {
    return this.api.post<Session>('/sessions/start', { id_usuario, token_jwt })
      .pipe(map(r => (r.data as Session)));
  }
  finalizarSesion(id_sesion: number) {
    return this.api.post('/sessions/end', { id_sesion });
  }
}
