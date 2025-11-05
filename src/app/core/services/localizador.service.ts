import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { ApiResponse, LocalizadorPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class LocalizadorService {
  constructor(private api: ApiService) {}

  guardarPunto(payload: LocalizadorPayload): Observable<ApiResponse> {
    return this.api.post('/localizador', payload);
  }

  obtenerPuntos(): Observable<ApiResponse> {
    return this.api.get('/localizador');
  }

  obtenerPredios(): Observable<ApiResponse> {
    return this.api.get('/catalogos/predios');
  }

  obtenerConductores(): Observable<ApiResponse> {
    return this.api.get('/catalogos/conductores');
  }
}
