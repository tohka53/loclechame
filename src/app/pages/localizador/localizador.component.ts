import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ApiService } from 'src/app/core/services/api.service';
import { GeolocationService } from 'src/app/core/services/geolocation.service';
import { SessionService } from 'src/app/core/services/session.service';

type EstadoRuta = 'INICIO_RUTA' | 'DESCANSO_RUTA' | 'DESPERFECTO_RUTA' | 'FIN_TRAYECTO';
type EstadoRutaOrSin = EstadoRuta | 'SIN_ESTADO';

@Component({
  selector: 'app-localizador',
  templateUrl: './localizador.component.html',
  styleUrls: ['./localizador.component.scss']
})
export class LocalizadorComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  // --------- Forms ---------
  form = this.fb.group({
    placa_cabezal: ['', Validators.required],
    id_predio: [null as number | null, Validators.required],
    id_conductor: [null as number | null, Validators.required],
    usarJson: [true],
  });

  showEstadoModal = false;
  estadoForm = this.fb.group({
    estado: ['INICIO_RUTA' as EstadoRuta, Validators.required],
    notas: ['']
  });

  // --------- Catálogos / listas ---------
  predios: Array<{ id_predio: number; nombre_predio: string }> = [];
  conductores: Array<{ id_conductor: number; nombre: string; apellido: string }> = [];
  puntos: any[] = [];

  // 👇 NECESARIA porque tu HTML muestra “Pendientes”
  pendientes: any[] = []; // si no usas cola offline, se queda vacía y no rompe la plantilla

  // --------- UI ---------
  loading = false;

  estadoRutaLabels: Record<EstadoRutaOrSin, string> = {
    INICIO_RUTA: 'Inicio de ruta',
    DESCANSO_RUTA: 'Descanso en ruta',
    DESPERFECTO_RUTA: 'Desperfecto en ruta',
    FIN_TRAYECTO: 'Fin de trayecto',
    SIN_ESTADO: 'Sin estado'
  };

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private geo: GeolocationService,
    public session: SessionService,
  ) {}

  ngOnInit(): void {
    // Catálogos
    this.subs.add(
      this.api.get('/catalogos/predios').subscribe(res => {
        if (res?.ok) this.predios = (res.data as any[]) || [];
      })
    );
    this.subs.add(
      this.api.get('/catalogos/conductores').subscribe(res => {
        if (res?.ok) this.conductores = (res.data as any[]) || [];
      })
    );

    // Puntos ya guardados
    this.cargarPuntos();

    // Si en el futuro agregas cola offline, aquí podrías poblar pendientes.
    // this.pendientes = this.offlineQueue.getPendingLocalizador();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ===================== Modal =====================
  preGuardar() {
    if (!this.session?.isActive?.()) {
      alert('No hay sesión activa.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.showEstadoModal = true;
  }

  cancelarEstadoModal() {
    this.showEstadoModal = false;
  }

  async confirmarEstado() {
    if (this.estadoForm.invalid) return;
    this.showEstadoModal = false;

    const estado = this.estadoForm.value.estado as EstadoRuta;
    const notas = (this.estadoForm.value.notas || '').trim() || null;

    await this.guardarPuntoConEstado(estado, notas);
    this.estadoForm.patchValue({ notas: '' });
  }

  // ===================== Guardado =====================
  private async guardarPuntoConEstado(estado: EstadoRuta, notas: string | null) {
    try {
      this.loading = true;

      const coords = await this.snapshotCoords();
      const usarJson = !!this.form.value.usarJson;

      const coordenadas_hora = usarJson
        ? JSON.stringify({
            lat: coords.lat,
            lng: coords.lng,
            accuracy: coords.accuracy ?? undefined,
            ts: coords.ts,
            estado_ruta: estado,
            notas_ruta: notas || undefined
          })
        : `${coords.lat},${coords.lng} @ ${coords.ts}`;

      // ✅ FIX: no uses getId(); intenta getIdSesion() o getSession()?.id_sesion
      const idSesion =
        (this.session as any)?.getIdSesion?.() ||
        (this.session as any)?.getSession?.()?.id_sesion ||
        'local';

      const payload: any = {
        placa_cabezal: this.form.value.placa_cabezal!,
        id_predio: Number(this.form.value.id_predio),
        id_conductor: Number(this.form.value.id_conductor),
        coordenadas_hora,
        estado_ruta: estado,
        notas_ruta: notas || undefined,
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy ?? undefined,
        id_sesion: idSesion,
      };

      this.subs.add(
        this.api.post('/localizador', payload).subscribe({
          next: (res) => {
            if (res?.ok) {
              const row = res.data ?? payload;
              this.puntos = [row, ...this.puntos];
            } else {
              alert(res?.message || 'No se pudo guardar el punto.');
            }
          },
          error: () => alert('Error al guardar el punto.'),
          complete: () => (this.loading = false),
        })
      );
    } catch (e) {
      console.error(e);
      this.loading = false;
      alert('No se pudieron obtener coordenadas.');
    }
  }

  // ===================== Data =====================
  private cargarPuntos() {
    this.subs.add(
      this.api.get('/localizador').subscribe(res => {
        if (res?.ok) this.puntos = (res.data as any[]) || [];
      })
    );
  }

  // ===================== GEO =====================
  private async snapshotCoords(): Promise<{
    lat: number | null;
    lng: number | null;
    accuracy?: number | null;
    ts: string;
  }> {
    try {
      const pos: any =
        (this.geo as any)?.getCurrentPosition
          ? await (this.geo as any).getCurrentPosition()
          : (this.geo as any)?.getPosition
          ? await (this.geo as any).getPosition()
          : null;

      if (pos) {
        const coords = pos.coords || pos;
        const ts =
          typeof pos.timestamp === 'number'
            ? new Date(pos.timestamp).toISOString()
            : pos.timestamp || new Date().toISOString();

        return {
          lat: coords.latitude ?? coords.lat ?? null,
          lng: coords.longitude ?? coords.lng ?? null,
          accuracy: coords.accuracy ?? null,
          ts,
        };
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.geolocation?.getCurrentPosition) {
      const navPos: GeolocationPosition = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        })
      );
      return {
        lat: navPos.coords.latitude,
        lng: navPos.coords.longitude,
        accuracy: navPos.coords.accuracy,
        ts: new Date(navPos.timestamp).toISOString()
      };
    }

    return {
      lat: null,
      lng: null,
      accuracy: null,
      ts: new Date().toISOString()
    };
  }

  get estadoActualLabel(): string {
    const v = (this.estadoForm.value.estado as EstadoRuta) || 'SIN_ESTADO';
    return this.estadoRutaLabels[v];
  }
}
