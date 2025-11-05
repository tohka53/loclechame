import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeolocationService {

  /** Devuelve fecha/hora LOCAL del dispositivo en formato 'YYYY-MM-DD HH:mm:ss' */
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

  async getCurrent(): Promise<{lat: number; lon: number; ts: string}> {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Tomamos el timestamp del GPS y lo formateamos en HORA LOCAL del dispositivo
    const tsLocal = this.formatLocalTimestamp(new Date(pos.timestamp));

    return { lat, lon, ts: tsLocal };
  }

  makeJsonString(lat: number, lon: number, ts: string): string {
    return JSON.stringify({ lat, lon, ts });
  }

  makeTupleString(lat: number, lon: number, ts: string): string {
    return `(${lat}, ${lon}, ${ts})`;
  }
}
