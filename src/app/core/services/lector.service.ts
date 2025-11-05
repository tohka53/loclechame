import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LectorPayload, ApiResponse } from '../models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LectorService {
  obtenerLecturas(): Observable<ApiResponse> { return this.api.get('/lector'); }
  constructor(private api: ApiService) {}
  guardarLectura(payload: LectorPayload): Observable<ApiResponse> {
    return this.api.post('/lector', payload);
  }
}
