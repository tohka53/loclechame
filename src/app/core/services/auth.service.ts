import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==========================================
// INTERFACES PARA ACTIVE DIRECTORY
// ==========================================
export interface LoginResponse {
  token: string;
  username: string;
  area: string;
  expiresIn?: number;
}

// ==========================================
// INTERFACES PARA SQL SERVER SESSION
// ✅ Todas en camelCase para coincidir con el backend
// ==========================================
export interface IniciarSesionRequest {
  usuarioRegistro: string;  // ← camelCase
  tokenJwt: string | null;  // ← camelCase
  ip: string | null;
  userAgent: string;        // ← camelCase
}

export interface IniciarSesionResponse {
  ok: boolean;              // ← camelCase
  idSesion: number;         // ← camelCase
}

export interface FinalizarSesionRequest {
  idSesion: number;         // ← camelCase
}

export interface FinalizarSesionResponse {
  ok: boolean;
  finalizada: boolean;
}

// ==========================================
// INTERFACE LOCAL PARA GESTIÓN DE SESIÓN
// ==========================================
export interface SessionData {
  id_usuario: string;
  id_sesion: number;
  token_jwt: string;
  area?: string;
  username?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userKey = 'user_data';
  private sessionKey = 'session_data';

  constructor(private http: HttpClient) { }

  /**
   * 🔐 Login contra Active Directory
   */
  login(credentials: { username: string, password: string }): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/api/Auth/login`, 
      credentials,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('❌ Error en login AD:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 📝 Crear sesión en SQL Server
   */
  createSqlSession(request: IniciarSesionRequest): Observable<IniciarSesionResponse> {
    return this.http.post<IniciarSesionResponse>(
      `${this.apiUrl}/api/Sesion/iniciar`,
      request
    ).pipe(
      catchError(error => {
        console.error('❌ Error al crear sesión SQL:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 🔚 Finalizar sesión en SQL Server
   */
  finalizarSesionSql(idSesion: number): Observable<FinalizarSesionResponse> {
    const request: FinalizarSesionRequest = {
      idSesion: idSesion
    };

    return this.http.post<FinalizarSesionResponse>(
      `${this.apiUrl}/api/Sesion/finalizar`,
      request
    ).pipe(
      catchError(error => {
        console.error('❌ Error al finalizar sesión SQL:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 💾 Guardar todos los datos después del login exitoso
   */
  storeUserData(token: string, username: string, area: string, id_sesion?: number): void {
    // Token JWT
    localStorage.setItem(this.tokenKey, token);
    
    // Datos básicos del usuario
    localStorage.setItem(this.userKey, JSON.stringify({
      username: username,
      area: area
    }));

    // Datos completos de sesión
    if (id_sesion) {
      const sessionData: SessionData = {
        id_usuario: username,
        id_sesion: id_sesion,
        token_jwt: token,
        area: area,
        username: username
      };
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
  }

  /**
   * 📊 Obtener datos completos de sesión
   */
  getSessionData(): SessionData | null {
    const sessionStr = localStorage.getItem(this.sessionKey);
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  /**
   * 🎫 Obtener token JWT
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * 👤 Obtener datos básicos del usuario
   */
  getUserData(): { username: string, area: string } | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * ✅ Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * 🚪 Logout completo (localStorage + SQL Server)
   */
  async logout(finalizarEnSql: boolean = true): Promise<void> {
    const sessionData = this.getSessionData();
    
    // Si hay sesión SQL activa, finalizarla
    if (finalizarEnSql && sessionData?.id_sesion) {
      try {
        const response = await this.finalizarSesionSql(sessionData.id_sesion).toPromise();
        console.log('✅ Sesión SQL finalizada:', response);
      } catch (error) {
        console.error('❌ Error al finalizar sesión SQL:', error);
        // Continuar con el logout local aunque falle el SQL
      }
    }

    // Limpiar localStorage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * 🔍 Verificar acceso al módulo localizador
   */
tieneAccesoLocalizador(): boolean {
  const userData = this.getUserData();
  const usuariosLocalizador = ['99570', '186943', '202620'];
  return userData ? usuariosLocalizador.includes(userData.username) : false;
}

/**
 * 🎯 Obtener ruta por defecto según perfil
 */
getRutaPorDefecto(): string {
  return this.tieneAccesoLocalizador() ? '/localizador' : '/lector';
}
}