import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ NO definimos LocalizadorPayload aquí, usamos el de core/models
// Esto evita el conflicto de tipos

export interface LocalizacionDto {
  idLocalizacion: number;
  idSesion?: number | null;
  placaCabezal: string;
  predio?: string | null;
  conductor?: string | null;
  transportista?: string | null;
  etapa: string;
  dispositivo?: string | null;
  usuarioRegistro: string;
  latitud: number;
  longitud: number;
  precisionMetros?: number | null;
  observaciones?: string | null;
  fechaRegistro: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class LocalizadorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Guarda un punto de localización
   * ✅ Acepta el payload del modelo existente y lo transforma internamente
   */
  guardarPunto(payload: any): Observable<ApiResponse<{ idLocalizacion: number }>> {
    // El payload viene con esta estructura del componente:
    // { placa_cabezal, id_predio, nombre_piloto, coordenadas_hora, estado_ruta, notas_ruta, lat, lng, id_sesion }
    
    // Transformar al formato esperado por el API
    const requestBody = {
      idSesion: payload.id_sesion,
      placaCabezal: payload.placa_cabezal,
      predio: payload.id_predio,
      conductor: payload.nombre_piloto,
      transportista: payload.transportista || null,
      etapa: payload.estado_ruta || 'SIN_ESTADO',
      dispositivo: navigator.userAgent,
      usuarioRegistro: payload.usuario_registro || 'Desconocido',
      latitud: payload.lat ?? 0,
      longitud: payload.lng ?? 0,
      precisionMetros: payload.precision_metros || null,
      observaciones: payload.notas_ruta || null
    };

    return this.http.post<ApiResponse<{ idLocalizacion: number }>>(
      `${this.apiUrl}/api/Localizador`,
      requestBody
    );
  }

  /**
   * Obtiene las últimas 100 localizaciones
   */
  obtenerPuntos(): Observable<ApiResponse<LocalizacionDto[]>> {
    return this.http.get<ApiResponse<LocalizacionDto[]>>(`${this.apiUrl}/api/Localizador`);
  }

  /**
   * Obtiene el catálogo de predios
   * NOTA: Este endpoint necesita ser implementado en el backend si no existe
   */
  obtenerPredios(): Observable<ApiResponse<any[]>> {
    // Si este endpoint no existe en tu API, deberás crearlo o usar otro servicio
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/Catalogos/predios`);
  }

  /**
   * Obtiene el catálogo de conductores
   * NOTA: Este endpoint necesita ser implementado en el backend si no existe
   */
  obtenerConductores(): Observable<ApiResponse<any[]>> {
    // Si este endpoint no existe en tu API, deberás crearlo o usar otro servicio
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/Catalogos/conductores`);
  }
}