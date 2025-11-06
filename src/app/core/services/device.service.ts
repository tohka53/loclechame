import { Injectable } from '@angular/core';

export interface DeviceInfo {
  name: string;         // p.ej. "iPhone", "Android SM-G991B" o "MacIntel"
  brand: string;        // p.ej. "Apple", "Samsung/Android?", "Unknown"
  model: string;        // p.ej. "SM-G991B", "iPhone", "Unknown"
  platform: string;     // navigator.platform
  ua: string;           // userAgent
  vendor?: string;      // navigator.vendor
  cores?: number;       // hardwareConcurrency
  memoryGB?: number;    // deviceMemory
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).platform || '';
    const vendor = (navigator as any).vendor || '';
    const cores = (navigator as any).hardwareConcurrency;
    const memory = (navigator as any).deviceMemory;

    let brand = 'Unknown';
    let model = 'Unknown';
    let name  = platform || 'Device';

    // heurísticas simples
    if (/iPhone|iPad|iPod/i.test(ua)) {
      brand = 'Apple';
      model = /iPhone|iPad|iPod/i.exec(ua)?.[0] || 'iOS Device';
      name  = model;
    } else if (/Android/i.test(ua)) {
      brand = 'Android';
      const m = ua.match(/Android.*;\s*([A-Za-z0-9\-_\s]+)\s*Build/i);
      model = m?.[1]?.trim() || 'Android Device';
      name  = `${model}`.trim();
      // algunos Android con Samsung:
      if (/SM\-[A-Z0-9]+/i.test(model)) brand = 'Samsung/Android?';
    } else if (/Mac/i.test(platform)) {
      brand = 'Apple';
      model = 'Mac';
      name  = platform;
    } else if (/Win/i.test(platform)) {
      brand = 'Windows';
      model = 'PC';
      name  = platform;
    }

    return {
      name,
      brand,
      model,
      platform,
      ua,
      vendor,
      cores,
      memoryGB: memory ? Number(memory) : undefined
    };
  }
}
