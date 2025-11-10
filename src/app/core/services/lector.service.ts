import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LectorPayload, ApiResponse } from '../models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LectorService {
  constructor(private api: ApiService) {}

  obtenerLecturas(): Observable<ApiResponse> {
    return this.api.get('/lector');
  }

  guardarLectura(payload: LectorPayload): Observable<ApiResponse> {
    return this.api.post('/lector', payload);
  }
}
