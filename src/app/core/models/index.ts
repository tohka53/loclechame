export interface Session {
  id_sesion: number;
  token_jwt: string;
  id_usuario?: string | null;
  fecha_inicio?: string;
  activo?: boolean;
}

export interface LectorPayload {
  codigo_barra: string;
  formato_barcode: string;
  coordenadas_hora: string;
  id_sesion: number;
  estado?: number;
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

export interface ApiResponse<T=any> {
  ok: boolean;
  data?: T;
  message?: string;
}
