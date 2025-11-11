import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ApiService } from 'src/app/core/services/api.service';
import { GeolocationService } from 'src/app/core/services/geolocation.service';
import { SessionService } from 'src/app/core/services/session.service';
import { CacheService } from 'src/app/core/services/cache.service';
import { LocalizadorService } from 'src/app/core/services/localizador.service';
import { JdeService, Unidad, Predio, Piloto } from 'src/app/core/services/jde.service';

type EstadoRuta = 'INICIO_RUTA' | 'DESCANSO_RUTA' | 'DESPERFECTO_RUTA' | 'FIN_TRAYECTO';
type EstadoRutaOrSin = EstadoRuta | 'SIN_ESTADO';

const CACHE_KEY = 'loclechame_form_localizador_v1';
const LS_TRANSP = 'loclechame_transportista_code';

@Component({
  selector: 'app-localizador',
  templateUrl: './localizador.component.html',
  styleUrls: ['./localizador.component.scss']
})
export class LocalizadorComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  // --------- Forms (ajustados a JDE) ---------
  form = this.fb.group({
    placa_cabezal: [null as string | null, Validators.required], // código Unidad
    id_predio: [null as string | null, Validators.required],      // código Predio
    nombre_piloto: [''],                                          // se llena por API
    usarJson: [true],
  });

  // Modal Estado (tuyo)
  showEstadoModal = false;
  estadoForm = this.fb.group({
    estado: ['INICIO_RUTA' as EstadoRuta, Validators.required],
    notas: ['']
  });

  // Modal Transportista (nuevo)
  transportistaForm = this.fb.group({ codigo: ['', Validators.required] });
  showTransportistaModal = false;
  loadingApis = false;
  codTransportista: string | null = null;

  // Catálogos
  unidades: Unidad[] = [];
  predios: Predio[] = [];
  puntos: any[] = [];
  pendientes: any[] = []; // sin cola offline por ahora

  // UI
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
    private cache: CacheService,
    private locSvc: LocalizadorService,
    private jde: JdeService,
    public session: SessionService,
  ) {}

  ngOnInit(): void {
    // Restaurar formulario (✅ FIX: fallback requerido)
    const cached = this.cache.get(CACHE_KEY, null as any);
    if (cached) this.form.patchValue(cached);
    this.subs.add(this.form.valueChanges.subscribe(v => this.cache.set(CACHE_KEY, v)));

    // Transportista guardado?
    const last = localStorage.getItem(LS_TRANSP);
    if (last) {
      this.codTransportista = last;
      this.cargarCatalogosDesdeJDE(last);
    } else {
      this.showTransportistaModal = true;
    }

    // Cambia placa → cargar piloto
    this.subs.add(
      this.form.get('placa_cabezal')!.valueChanges.subscribe(val => {
        if (val) this.cargarPiloto(String(val));
        else this.form.get('nombre_piloto')!.setValue('');
      })
    );

    this.cargarPuntos();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ===== Modal Estado (tuyo) =====
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

  cancelarEstadoModal() { this.showEstadoModal = false; }

  async confirmarEstado() {
    if (this.estadoForm.invalid) return;
    this.showEstadoModal = false;
    const estado = this.estadoForm.value.estado as EstadoRuta;
    const notas = (this.estadoForm.value.notas || '').trim() || null;
    await this.guardarPuntoConEstado(estado, notas);
    this.estadoForm.patchValue({ notas: '' });
  }

  // ===== Modal Transportista (nuevo) =====
  abrirModalTransportista() {
    this.transportistaForm.reset({ codigo: this.codTransportista || '' });
    this.showTransportistaModal = true;
  }

  confirmarTransportista() {
    if (this.transportistaForm.invalid) return;
    const code = this.transportistaForm.value.codigo!.trim();
    this.loadingApis = true;
    this.cargarCatalogosDesdeJDE(code, () => {
      this.loadingApis = false;
      this.showTransportistaModal = false;
      this.codTransportista = code;
      localStorage.setItem(LS_TRANSP, code);
    }, () => {
      this.loadingApis = false;
      alert('No fue posible cargar catálogos desde JDE. Verifica el código o tu red.');
    });
  }

  private cargarCatalogosDesdeJDE(code: string, ok?: () => void, fail?: (e:any)=>void) {
    const s1 = this.jde.getPrediosPorTransportista(code).subscribe({
      next: pred => { this.predios = pred; },
      error: e => fail?.(e)
    });
    const s2 = this.jde.getUnidadesPorTransportista(code).subscribe({
      next: uds => { this.unidades = uds; ok?.(); },
      error: e => fail?.(e)
    });
    this.subs.add(s1); this.subs.add(s2);
  }

  private cargarPiloto(codigoUnidad: string) {
    const sub = this.jde.getPilotoPorUnidad(codigoUnidad).subscribe({
      next: (p: Piloto | null) => {
        this.form.get('nombre_piloto')!.setValue(p?.staffName || '');
      },
      error: () => this.form.get('nombre_piloto')!.setValue('')
    });
    this.subs.add(sub);
  }

  // ===== Guardado =====
  private async guardarPuntoConEstado(estado: EstadoRuta, notas: string | null) {
    try {
      this.loading = true;

      // ✅ FIX: usar tu servicio real
      const pos = await this.geo.getCurrent().catch(() => null);
      const lat = pos?.lat ?? null;
      const lng = pos?.lon ?? null;
      const ts  = pos?.ts  ?? new Date().toISOString();

      const usarJson = !!this.form.value.usarJson;
      const coordenadas_hora = usarJson
        ? JSON.stringify({ lat, lng, ts, estado_ruta: estado, notas_ruta: notas || undefined })
        : `${lat},${lng} @ ${ts}`;

      const idSesion =
        (this.session as any)?.getIdSesion?.() ||
        (this.session as any)?.getSession?.()?.id_sesion ||
        'local';

      const payload: any = {
        placa_cabezal: this.form.value.placa_cabezal!,
        id_predio: this.form.value.id_predio!,         // código de predio JDE
        nombre_piloto: this.form.value.nombre_piloto || null,
        coordenadas_hora,
        estado_ruta: estado,
        notas_ruta: notas || undefined,
        lat, lng,
        id_sesion: idSesion,
      };

      this.subs.add(
        this.locSvc.guardarPunto(payload).subscribe({
          next: (res) => {
            if (res?.ok) {
              const row = res.data ?? payload;
              this.puntos = [row, ...this.puntos];
              // limpiar selects (mantengo transportista seleccionado)
              this.form.patchValue({ placa_cabezal: null, id_predio: null, nombre_piloto: '' });
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

  // ===== Data =====
  private cargarPuntos() {
    this.subs.add(
      this.locSvc.obtenerPuntos().subscribe(res => {
        if (res?.ok) this.puntos = (res.data as any[]) || [];
      })
    );
  }

  // ===== Helper etiqueta =====
  get estadoActualLabel(): string {
    const v = (this.estadoForm.value.estado as EstadoRuta) || 'SIN_ESTADO';
    return this.estadoRutaLabels[v];
  }
}
