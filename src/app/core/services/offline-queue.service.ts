// src/app/core/services/offline-queue.service.ts
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CacheService } from './cache.service';
import { LocalizadorService } from './localizador.service';
import { LectorService } from './lector.service';
import { LectorPayload } from '../models';

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
    // Intentar flush al iniciar si hay conexión
    this.tryFlush();
    // Reintentar cuando regrese la conexión
    window.addEventListener('online', () => this.tryFlush());
  }

  // ========= Utilidades internas de cola =========
  private getQueue<T = any>(key: string): T[] {
    // FIX: CacheService.get requiere fallback
    return this.cache.get<T[]>(key, []);
  }

  private setQueue<T = any>(key: string, arr: T[]) {
    this.cache.set(key, arr);
  }

  // ========= API pública que usan tus componentes =========

  /** Encola un payload del localizador para enviar cuando haya conexión */
  enqueueLocalizador(payload: any) {
    const q = this.getQueue(Q_LOCALIZADOR);
    q.push(payload);
    this.setQueue(Q_LOCALIZADOR, q);
  }

  /** Encola un payload del lector (incluye etapa si viene en el payload) */
  enqueueLector(payload: LectorPayload) {
    const q = this.getQueue<LectorPayload>(Q_LECTOR);
    q.push(payload);
    this.setQueue(Q_LECTOR, q);
  }

  /** Devuelve una copia de los pendientes de Localizador (para UI) */
  getPendingLocalizador(): any[] {
    return [...this.getQueue(Q_LOCALIZADOR)];
  }

  /** (Opcional) pendientes de Lector por si quieres mostrarlos */
  getPendingLector(): LectorPayload[] {
    return [...this.getQueue<LectorPayload>(Q_LECTOR)];
  }

  /** Exponer estado de conexión para el componente */
  isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  /** Lanza un flush manual de todas las colas (alias público) */
  async flushAll(): Promise<void> {
    await this.tryFlush();
  }

  // ========= Flush principal =========

  /** Intenta enviar todas las colas si hay conexión (idempotente) */
  async tryFlush(): Promise<void> {
    if (this.flushing || !this.isOnline()) return;
    this.flushing = true;
    try {
      await this.flushLocalizador();
      await this.flushLector();
    } finally {
      this.flushing = false;
    }
  }

  // ========= Flushers específicos =========

  private async flushLocalizador(): Promise<void> {
    if (!this.isOnline()) return;
    const queue = this.getQueue(Q_LOCALIZADOR);
    if (!queue.length) return;

    const kept: any[] = [];
    for (const item of queue) {
      try {
        await lastValueFrom(this.loc.guardarPunto(item));
      } catch {
        // mantener en cola si falla
        kept.push(item);
      }
    }
    this.setQueue(Q_LOCALIZADOR, kept);
  }

  private async flushLector(): Promise<void> {
    if (!this.isOnline()) return;
    const queue = this.getQueue<LectorPayload>(Q_LECTOR);
    if (!queue.length) return;

    const kept: LectorPayload[] = [];
    for (const item of queue) {
      try {
        await lastValueFrom(this.lec.guardarLectura(item));
      } catch {
        kept.push(item);
      }
    }
    this.setQueue<LectorPayload>(Q_LECTOR, kept);

  }

  /** Limpia ambas colas (útil en logout) */
  clearQueues() {
    this.setQueue(Q_LOCALIZADOR, []);
    this.setQueue(Q_LECTOR, []);
  }
}
