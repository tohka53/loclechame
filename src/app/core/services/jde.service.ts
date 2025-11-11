import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export type Unidad = { codigo: string; tipo: string };
export type Predio = { codigo: string; nombre: string; detalle?: string };
export type Piloto = { staffNumber: number; staffName: string };

const BASE = 'https://hamejdeorchpy.endtoend.com.mx/jderest/orchestrator';

@Injectable({ providedIn: 'root' })
export class JdeService {
  constructor(private http: HttpClient) {}

  getUnidadesPorTransportista(codTransportista: string): Observable<Unidad[]> {
    const url = `${BASE}/JDE_ORCH_55_UnidadesPorTransportistaMP`;
    return this.http.post<any>(url, { Cod_Transportista: codTransportista }).pipe(
      map(r => (r?.JDE_FREQ_55_UnidadesPorTransportistasMP_1 ?? []).map((x: any) => ({
        codigo: x?.Codigo_Unidad,
        tipo: x?.Tipo_Unidad
      })))
    );
  }

  getPrediosPorTransportista(codTransportista: string): Observable<Predio[]> {
    const url = `${BASE}/JDE_ORCH_55_PrediosPorTransportistasMP`;
    return this.http.post<any>(url, { Codigo_Transportista: codTransportista }).pipe(
      map(r => (r?.JDE_DREQ_55_PrediosPorTransportistasMP ?? []).map((x: any) => ({
        codigo: x?.Codigo_Predio,
        nombre: x?.Nombre_Predio,
        detalle: x?.Detalle_Predio
      })))
    );
  }

  getPilotoPorUnidad(codigoUnidad: string): Observable<Piloto | null> {
    const url = `${BASE}/JDE_ORCH_55_CodigoPilotoPorUnidadMP`;
    return this.http.post<any>(url, { Codigo_Unidad: codigoUnidad }).pipe(
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
