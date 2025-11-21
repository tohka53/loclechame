import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SqlDirectService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async insertarSesion(data: {
    usuario_registro: string;
    token_jwt?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  }): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ ok: boolean; idSesion: number }>(
        `${this.apiUrl}/api/Sesion/iniciar`,  // ✅ CORREGIDO: agregado /api/
        {
          usuarioRegistro: data.usuario_registro,
          tokenJwt: data.token_jwt,
          ip: data.ip,
          userAgent: data.user_agent
        }
      )
    );
    return response.idSesion;
  }

  async finalizarSesion(id_sesion: number): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<{ ok: boolean; finalizada: boolean }>(
        `${this.apiUrl}/api/Sesion/finalizar`,  // ✅ CORREGIDO: agregado /api/
        { idSesion: id_sesion }
      )
    );
    return response.finalizada;
  }

  async insertarLectura(data: {
    id_sesion: number;
    codigo_barra: string;
    formato_barcode?: string | null;
    etapa: string;
    dispositivo?: string | null;
    area?: string | null;
    usuario_registro: string;
    latitud?: number | null;
    longitud?: number | null;
    precision_metros?: number | null;
  }): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ ok: boolean; idLectura: number }>(
        `${this.apiUrl}/api/Lecturas`,  // ✅ CORREGIDO: agregado /api/
        {
          idSesion: data.id_sesion,
          codigoBarra: data.codigo_barra,
          formatoBarcode: data.formato_barcode,
          etapa: data.etapa,
          dispositivo: data.dispositivo,
          area: data.area,
          usuarioRegistro: data.usuario_registro,
          latitud: data.latitud,
          longitud: data.longitud,
          precisionMetros: data.precision_metros
        }
      )
    );
    return response.idLectura;
  }

  async insertarLocalizacion(data: {
    id_sesion?: number | null;
    placa_cabezal: string;
    predio?: string | null;
    conductor?: string | null;
    transportista?: string | null;
    etapa: string;
    dispositivo?: string | null;
    usuario_registro: string;
    latitud: number;
    longitud: number;
    precision_metros?: number | null;
    observaciones?: string | null;
  }): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ ok: boolean; idLocalizacion: number }>(
        `${this.apiUrl}/api/Localizador`,  // ✅ CORREGIDO: agregado /api/
        {
          idSesion: data.id_sesion,
          placaCabezal: data.placa_cabezal,
          predio: data.predio,
          conductor: data.conductor,
          transportista: data.transportista,
          etapa: data.etapa,
          dispositivo: data.dispositivo,
          usuarioRegistro: data.usuario_registro,
          latitud: data.latitud,
          longitud: data.longitud,
          precisionMetros: data.precision_metros,
          observaciones: data.observaciones
        }
      )
    );
    return response.idLocalizacion;
  }

  async obtenerLecturas(): Promise<any[]> {
    const response = await firstValueFrom(
      this.http.get<{ ok: boolean; data: any[] }>(
        `${this.apiUrl}/api/Lecturas`  // ✅ CORREGIDO: agregado /api/
      )
    );
    return response.data;
  }

  async obtenerLocalizaciones(): Promise<any[]> {
    const response = await firstValueFrom(
      this.http.get<{ ok: boolean; data: any[] }>(
        `${this.apiUrl}/api/Localizador`  // ✅ CORREGIDO: agregado /api/
      )
    );
    return response.data;
  }
}