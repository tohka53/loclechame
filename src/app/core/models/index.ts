// src/app/core/models/index.ts

export interface Session {
  id_sesion: number;
  token_jwt: string;
  id_usuario?: string | null;
  fecha_inicio?: string;
  activo?: boolean;
}

/** Etapas posibles para las lecturas del lector */
export type EtapaLectura = 'INICIO_CARGA' | 'FIN_CARGA' | 'TOMA_LAB';

export interface LectorPayload {
  codigo_barra: string;
  formato_barcode: string;
  coordenadas_hora: string;
  id_sesion: number;
  /** 1=activo (se mantiene opcional para compatibilidad) */
  estado?: number;
  /** Etapa del proceso (inicio/fin carga, toma lab) */
  etapa?: EtapaLectura;
  /** NUEVO: área a la que pertenece la lectura */
  area?: string;
  /** NUEVO: usuario/operador que registra */
  usuario_registro?: string;
}

export interface LocalizadorPayload {
  placa_cabezal: string;
  id_predio: number;
  id_conductor: number;
  coordenadas_hora: string;
  id_sesion: number;
  estado?: number;
}

export interface Conductor {
  id_conductor: number;
  nombre: string;
  apellido: string;
}

export interface Predio {
  id_predio: number;
  nombre_predio: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
}
