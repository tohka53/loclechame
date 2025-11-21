import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export type Unidad = { codigo: string; tipo: string };
export type Predio = { codigo: string; nombre: string; detalle?: string };
export type Piloto = { staffNumber: number; staffName: string };

const BASE = 'https://hamejdeorchpy.endtoend.com.mx/jderest/orchestrator';

// ⚠️ En un proyecto real esto debería ir en variables de entorno / backend,
// pero por ahora lo dejamos aquí tal como lo usas en Postman.
const JDE_USER = 'mcabrera';
const JDE_PASS = 'Hame2025$';

@Injectable({ providedIn: 'root' })
export class JdeService {
  constructor(private http: HttpClient) {}

  /** Headers con Basic Auth + JSON */
  private getHeaders(): HttpHeaders {
    const basic = btoa(`${JDE_USER}:${JDE_PASS}`);
    return new HttpHeaders({
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json'
    });
  }

  getUnidadesPorTransportista(codTransportista: string): Observable<Unidad[]> {
    const url = `${BASE}/JDE_ORCH_55_UnidadesPorTransportistaMP`;
    const body = { Cod_Transportista: codTransportista };

    return this.http.post<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(r =>
        (r?.JDE_FREQ_55_UnidadesPorTransportistasMP_1 ?? []).map((x: any) => ({
          codigo: x?.Codigo_Unidad,
          tipo: x?.Tipo_Unidad
        }))
      )
    );
  }

  getPrediosPorTransportista(codTransportista: string): Observable<Predio[]> {
    const url = `${BASE}/JDE_ORCH_55_PrediosPorTransportistasMP`;
    const body = { Codigo_Transportista: codTransportista };

    return this.http.post<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(r =>
        (r?.JDE_DREQ_55_PrediosPorTransportistasMP ?? []).map((x: any) => ({
          codigo: x?.Codigo_Predio,
          nombre: x?.Nombre_Predio,
          detalle: x?.Detalle_Predio
        }))
      )
    );
  }

  getPilotoPorUnidad(codigoUnidad: string): Observable<Piloto | null> {
    const url = `${BASE}/JDE_ORCH_55_CodigoPilotoPorUnidadMP`;
    const body = { Codigo_Unidad: codigoUnidad };

    return this.http.post<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(r => {
        const arr = r?.JDE_FREQ_55_CodigoPilotoPorUnidadMP_1 ?? [];
        if (!arr.length) return null;
        const it = arr[0];
        return {
          staffNumber: it?.['Staff Number'],
          staffName: it?.['Staff Name'],
        } as Piloto;
      })
    );
  }
}
