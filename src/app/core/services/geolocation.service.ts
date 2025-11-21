import { Injectable } from '@angular/core';
import { DeviceService, DeviceInfo } from './device.service';

export interface GeoMeta {
  ts: string;
  tzOffset: string;
  lat: number;
  lon: number;
  accuracy?: number;
  user?: string;
  device: DeviceInfo;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  // ✅ Coordenadas de fallback (Ciudad de Guatemala)
  private readonly FALLBACK_COORDS = {
    lat: 14.6349,  // Guatemala City
    lon: -90.5069,
    accuracy: 50
  };

  constructor(private deviceSvc: DeviceService) {}

  private formatLocalTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const Y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const D = pad(date.getDate());
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  private tzOffsetString(date: Date): string {
    const off = -date.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${sign}${hh}${mm}`;
  }

  async getCurrentRich(user?: string): Promise<GeoMeta> {
    console.log('🌍 Solicitando geolocalización...');

    let coords: { latitude: number; longitude: number; accuracy: number };
    let usedFallback = false;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          console.error('❌ Geolocalización no soportada');
          reject(new Error('Geolocalización no soportada'));
          return;
        }

        console.log('📍 Llamando a getCurrentPosition...');
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Posición GPS obtenida:', {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
            resolve(position);
          },
          (error) => {
            console.error('❌ Error de geolocalización:', {
              code: error.code,
              message: error.message
            });
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000, // ✅ 10 segundos
            maximumAge: 0
          }
        );
      });

      coords = pos.coords;
    } catch (error) {
      // ✅ Usar coordenadas de fallback
      console.warn('⚠️ GPS no disponible, usando coordenadas de fallback');
      coords = {
        latitude: this.FALLBACK_COORDS.lat,
        longitude: this.FALLBACK_COORDS.lon,
        accuracy: this.FALLBACK_COORDS.accuracy
      };
      usedFallback = true;
    }

    const d = new Date();
    const dev = this.deviceSvc.getDeviceInfo();

    const geoMeta = {
      ts: this.formatLocalTimestamp(d),
      tzOffset: this.tzOffsetString(d),
      lat: coords.latitude,
      lon: coords.longitude,
      accuracy: coords.accuracy,
      user,
      device: dev
    };

    if (usedFallback) {
      console.log('⚠️ GeoMeta con coordenadas de fallback:', geoMeta);
    } else {
      console.log('✅ GeoMeta con GPS real:', geoMeta);
    }

    return geoMeta;
  }

  async getCurrent() {
    try {
      console.log('📍 getCurrent() iniciado...');
      const meta = await this.getCurrentRich();
      const result = { lat: meta.lat, lon: meta.lon, ts: meta.ts };
      console.log('✅ getCurrent() resultado:', result);
      return result;
    } catch (error) {
      console.error('❌ getCurrent() falló:', error);
      throw error;
    }
  }

  makeJsonString(meta: any): string {
    return JSON.stringify(meta);
  }

  makeTupleString(lat: number, lon: number, ts: string): string {
    return `(${lat}, ${lon}, ${ts})`;
  }

  // ✅ Método para establecer coordenadas personalizadas (útil para testing)
  setFallbackCoords(lat: number, lon: number, accuracy: number = 50) {
    (this.FALLBACK_COORDS as any).lat = lat;
    (this.FALLBACK_COORDS as any).lon = lon;
    (this.FALLBACK_COORDS as any).accuracy = accuracy;
    console.log('✅ Coordenadas de fallback actualizadas:', this.FALLBACK_COORDS);
  }
}