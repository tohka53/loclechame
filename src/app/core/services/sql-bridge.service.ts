// Asegúrate de tener "dom" y "es2020" en tsconfig lib
import { Injectable } from '@angular/core';
 
declare global {
  interface Window {
    db?: {
      sesionIniciar(data: {
        usuario_registro: string;
        token_jwt?: string | null;
        ip?: string | null;
        user_agent?: string | null;
      }): Promise<number>;
      sesionFinalizar(id: number): Promise<boolean>;
      lecturasInsertar(data: {
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
      }): Promise<number>;
      localizadorInsertar(data: {
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
      }): Promise<number>;
    };
  }
}
 
@Injectable({ providedIn: 'root' })
export class SqlBridgeService {
  private get api() {
    if (!window.db) {
      throw new Error('Electron bridge no disponible (window.db)');
    }
    return window.db;
  }
 
  iniciarSesion(p: { 
    usuario_registro: string; 
    token_jwt?: string | null; 
    ip?: string | null; 
    user_agent?: string | null; 
  }) {
    return this.api.sesionIniciar(p);
  }
 
  finalizarSesion(id: number) {
    return this.api.sesionFinalizar(id);
  }
 
  // ✅ Método corregido para lecturas con extracción de coordenadas
  async insertarLectura(p: {
    id_sesion: number; 
    codigo_barra: string; 
    formato_barcode?: string | null; 
    etapa: string;
    coordenadas_hora: string;  // ✅ JSON string con lat/lng/lon
    dispositivo?: string | null; 
    area?: string | null; 
    usuario_registro: string;
  }) {
    console.log('📦 SqlBridge.insertarLectura - Input:', {
      codigo: p.codigo_barra,
      coordenadas_hora: p.coordenadas_hora
    });

    // ✅ Extraer lat/lng del JSON
    let lat: number | null = null;
    let lng: number | null = null;
    let precision: number | null = null;

    try {
      const coords = JSON.parse(p.coordenadas_hora);
      console.log('📍 Coordenadas parseadas:', coords);
      
      // ✅ Extraer latitud
      lat = coords.lat ?? null;
      
      // ✅ Extraer longitud (puede venir como "lon" o "lng")
      lng = coords.lon ?? coords.lng ?? null;
      
      // ✅ Extraer precisión
      precision = coords.accuracy ?? coords.precision_metros ?? null;

      console.log('✅ Coordenadas extraídas:', { lat, lng, precision });

      // ⚠️ Validación: si las coordenadas son inválidas, loggear warning
      if (lat === null || lng === null) {
        console.warn('⚠️ Coordenadas nulas o inválidas');
      }
      
      // ✅ Validar rangos
      if (lat !== null && (lat < -90 || lat > 90)) {
        console.warn('⚠️ Latitud fuera de rango:', lat);
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        console.warn('⚠️ Longitud fuera de rango:', lng);
      }

    } catch (e) {
      console.error('❌ No se pudo parsear coordenadas_hora:', e);
    }

    const payload = {
      id_sesion: p.id_sesion,
      codigo_barra: p.codigo_barra,
      formato_barcode: p.formato_barcode ?? null,
      etapa: p.etapa,
      dispositivo: p.dispositivo ?? null,
      area: p.area ?? null,
      usuario_registro: p.usuario_registro,
      latitud: lat,
      longitud: lng,
      precision_metros: precision
    };

    console.log('📤 Enviando a SQL Server:', payload);

    return this.api.lecturasInsertar(payload);
  }
 
  // ✅ Método corregido para localizador con extracción de coordenadas
  async insertarLocalizacion(p: {
    id_sesion?: number | null; 
    placa_cabezal: string; 
    coordenadas_hora: string;  // ✅ JSON string con lat/lng/lon
    predio?: string | null; 
    conductor?: string | null;
    transportista?: string | null; 
    etapa: string; 
    dispositivo?: string | null; 
    usuario_registro: string;
    observaciones?: string | null;
  }) {
    console.log('📍 SqlBridge.insertarLocalizacion - Input:', {
      placa: p.placa_cabezal,
      coordenadas_hora: p.coordenadas_hora
    });

    // ✅ Extraer lat/lng del JSON
    let lat: number = 0;
    let lng: number = 0;
    let precision: number | null = null;

    try {
      const coords = JSON.parse(p.coordenadas_hora);
      console.log('📍 Coordenadas parseadas:', coords);
      
      // ✅ Extraer latitud (requerido para localizador)
      lat = coords.lat ?? 0;
      
      // ✅ Extraer longitud (puede venir como "lon" o "lng")
      lng = coords.lon ?? coords.lng ?? 0;
      
      // ✅ Extraer precisión
      precision = coords.accuracy ?? coords.precision_metros ?? null;

      console.log('✅ Coordenadas extraídas:', { lat, lng, precision });

      // ⚠️ Validación
      if (lat === 0 && lng === 0) {
        console.warn('⚠️ Coordenadas en origen (0,0) - posible error');
      }

      // ✅ Validar rangos
      if (lat < -90 || lat > 90) {
        console.warn('⚠️ Latitud fuera de rango:', lat);
        lat = 0;
      }
      if (lng < -180 || lng > 180) {
        console.warn('⚠️ Longitud fuera de rango:', lng);
        lng = 0;
      }

    } catch (e) {
      console.error('❌ No se pudo parsear coordenadas_hora:', e);
    }

    const payload = {
      id_sesion: p.id_sesion ?? null,
      placa_cabezal: p.placa_cabezal,
      predio: p.predio ?? null,
      conductor: p.conductor ?? null,
      transportista: p.transportista ?? null,
      etapa: p.etapa,
      dispositivo: p.dispositivo ?? null,
      usuario_registro: p.usuario_registro,
      latitud: lat,
      longitud: lng,
      precision_metros: precision,
      observaciones: p.observaciones ?? null
    };

    console.log('📤 Enviando a SQL Server:', payload);

    return this.api.localizadorInsertar(payload);
  }
}