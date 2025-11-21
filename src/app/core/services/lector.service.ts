import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ NO definimos LectorPayload aquí, usamos el de core/models
// Esto evita el conflicto de tipos

export interface LecturaDto {
  idLectura: number;
  idSesion: number;
  codigoBarra: string;
  formatoBarcode?: string | null;
  etapa: string;
  dispositivo?: string | null;
  area?: string | null;
  usuarioRegistro: string;
  latitud?: number | null;
  longitud?: number | null;
  precisionMetros?: number | null;
  fechaRegistro: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class LectorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las últimas 100 lecturas
   */
  obtenerLecturas(): Observable<ApiResponse<LecturaDto[]>> {
    return this.http.get<ApiResponse<LecturaDto[]>>(`${this.apiUrl}/api/Lecturas`);
  }

  /**
   * Guarda una nueva lectura de código de barras
   * ✅ Acepta el payload del modelo existente y lo transforma internamente
   */
  guardarLectura(payload: any): Observable<ApiResponse<{ idLectura: number }>> {
    // Transformar el payload del componente al formato esperado por el API
    // El payload viene con estructura del modelo existente:
    // { codigo_barra, formato_barcode, coordenadas_hora, id_sesion, estado, etapa, area, usuario_registro }
    
    const requestBody = {
      idSesion: payload.id_sesion,
      codigoBarra: payload.codigo_barra,
      formatoBarcode: payload.formato_barcode,
      etapa: payload.etapa,
      dispositivo: payload.dispositivo || null,
      area: payload.area,
      usuarioRegistro: payload.usuario_registro,
      latitud: payload.latitud || null,
      longitud: payload.longitud || null,
      precisionMetros: payload.precision_metros || null
    };

    return this.http.post<ApiResponse<{ idLectura: number }>>(
      `${this.apiUrl}/api/Lecturas`,
      requestBody
    );
  }
}