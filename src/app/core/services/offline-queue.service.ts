import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { LocalizadorService } from '../services/localizador.service';
import { LectorService } from '../services/lector.service';

const Q_LOCALIZADOR = 'loclechame_offq_localizador_v1';
const Q_LECTOR      = 'loclechame_offq_lector_v1';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private flushing = false;

  constructor(
    private cache: CacheService,
    private loc: LocalizadorService,
    private lec: LectorService
  ) {
    // Al volver la conexión → sincronizar automáticamente
    window.addEventListener('online', () => this.flushAll());
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // ----- helpers de cola -----
  private getQueue(key: string): any[] {
    return this.cache.get<any[]>(key, []);
  }
  private setQueue(key: string, q: any[]) {
    this.cache.set(key, q);
  }
  private enqueue(key: string, item: any) {
    const q = this.getQueue(key);
    q.push(item);
    this.setQueue(key, q);
  }

  // ----- APIs públicas -----
  enqueueLocalizador(payload: any) { this.enqueue(Q_LOCALIZADOR, payload); }
  enqueueLector(payload: any)      { this.enqueue(Q_LECTOR, payload); }

  getPendingLocalizador(): any[] { return this.getQueue(Q_LOCALIZADOR); }
  getPendingLector(): any[]      { return this.getQueue(Q_LECTOR); }

  async flushAll() {
    if (this.flushing) return;
    if (!this.isOnline()) return;
    this.flushing = true;
    try {
      await this.flushLocalizador();
      await this.flushLector();
    } finally {
      this.flushing = false;
    }
  }

  async flushLocalizador() {
    if (!this.isOnline()) return;
    let q = this.getQueue(Q_LOCALIZADOR);
    if (!q.length) return;
    const kept: any[] = [];
    for (const item of q) {
      try {
        await this.loc.guardarPunto(item).toPromise();
      } catch {
        kept.push(item); // si falla, lo conservamos
      }
    }
    this.setQueue(Q_LOCALIZADOR, kept);
  }

  async flushLector() {
    if (!this.isOnline()) return;
    let q = this.getQueue(Q_LECTOR);
    if (!q.length) return;
    const kept: any[] = [];
    for (const item of q) {
      try {
        await this.lec.guardarLectura(item).toPromise();
      } catch {
        kept.push(item);
      }
    }
    this.setQueue(Q_LECTOR, kept);
  }

  /** Limpia colas (para logout) */
  clearQueues() {
    this.setQueue(Q_LOCALIZADOR, []);
    this.setQueue(Q_LECTOR, []);
  }
}
