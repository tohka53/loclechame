import { Injectable } from '@angular/core';
import { DeviceService, DeviceInfo } from './device.service';

export interface GeoMeta {
  ts: string;           // 'YYYY-MM-DD HH:mm:ss' (LOCAL)
  tzOffset: string;     // -0600, +0200, etc.
  lat: number;
  lon: number;
  accuracy?: number;    // en metros
  user?: string;        // id_usuario
  device: DeviceInfo;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
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
    const off = -date.getTimezoneOffset(); // min
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${sign}${hh}${mm}`;
  }

  /** Meta “rico”: fecha/hora LOCAL, tzOffset, coords, accuracy, usuario y device */
  async getCurrentRich(user?: string): Promise<GeoMeta> {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );

    const d = new Date(pos.timestamp);
    const dev = this.deviceSvc.getDeviceInfo();

    return {
      ts: this.formatLocalTimestamp(d),
      tzOffset: this.tzOffsetString(d),
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      user,
      device: dev
    };
  }

  // Compatibilidad con lo que ya usabas:
  async getCurrent() {
    const meta = await this.getCurrentRich();
    return { lat: meta.lat, lon: meta.lon, ts: meta.ts };
  }

  makeJsonString(meta: any): string {
    return JSON.stringify(meta);
  }

  makeTupleString(lat: number, lon: number, ts: string): string {
    return `(${lat}, ${lon}, ${ts})`;
  }
}
