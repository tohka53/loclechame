import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LocalizadorService } from '../../core/services/localizador.service';
import { SessionService } from '../../core/services/session.service';
import { CacheService } from '../../core/services/cache.service';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { Subscription } from 'rxjs';

const CACHE_KEY = 'loclechame_form_localizador_v1';

@Component({
  selector: 'app-localizador',
  templateUrl: './localizador.component.html',
  styleUrls: ['./localizador.component.scss']
})
export class LocalizadorComponent implements OnInit, OnDestroy {
  form = this.fb.group({
    placa_cabezal: ['', Validators.required],
    id_predio: [null as unknown as number, Validators.required],
    id_conductor: [null as unknown as number, Validators.required],
    usarJson: [true]
  });

  predios: any[] = [];
  conductores: any[] = [];
  puntos: any[] = [];
  pendientes: any[] = []; // ← cola offline visible

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private geo: GeolocationService,
    private service: LocalizadorService,
    private session: SessionService,
    private cache: CacheService,
    private offq: OfflineQueueService
  ) {}

  ngOnInit(): void {
    const draft = this.cache.get(CACHE_KEY, null as any);
    if (draft) this.form.patchValue(draft, { emitEvent: false });

    let t: any;
    this.subs.add(
      this.form.valueChanges.subscribe(v => {
        clearTimeout(t);
        t = setTimeout(() => this.cache.set(CACHE_KEY, v), 200);
      })
    );

    this.service.obtenerPredios().subscribe(r => this.predios = r.data || []);
    this.service.obtenerConductores().subscribe(r => this.conductores = r.data || []);
    this.cargarPuntos();

    // muestra pendientes al entrar y trata de sincronizar si vuelve en línea
    this.pendientes = this.offq.getPendingLocalizador();
    this.offq.flushAll();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.cache.set(CACHE_KEY, this.form.value);
  }

  async guardarPunto() {
    if (!this.session.isActive()) return alert('No hay sesión activa');
    if (this.form.invalid) return;

    const user = this.session.getUsuario() || 'N/D';
    const meta = await this.geo.getCurrentRich(user);
    const usarJson = this.form.value.usarJson!;
    const coordenadas_hora = usarJson
      ? this.geo.makeJsonString(meta)
      : this.geo.makeTupleString(meta.lat, meta.lon, meta.ts);

    const payload = {
      placa_cabezal: this.form.value.placa_cabezal!,
      id_predio: Number(this.form.value.id_predio),
      id_conductor: Number(this.form.value.id_conductor),
      coordenadas_hora,
      id_sesion: this.session.getIdSesion()!,
      estado: 1
    };

    if (!this.offq.isOnline()) {
      this.offq.enqueueLocalizador(payload);
      this.pendientes = this.offq.getPendingLocalizador();
      alert('Sin conexión: punto guardado en cola offline.');
      return;
    }

    this.service.guardarPunto(payload).subscribe({
      next: _ => { alert('Punto guardado'); this.cargarPuntos(); },
      error: err => {
        if (err?.status === 0) { // error de red
          this.offq.enqueueLocalizador(payload);
          this.pendientes = this.offq.getPendingLocalizador();
          alert('Problema de red: punto en cola offline.');
        } else {
          alert('Error al guardar punto');
        }
      }
    });
  }

  cargarPuntos() {
    this.service.obtenerPuntos().subscribe(r => {
      this.puntos = (r.data as any[]) || [];
    });
  }
}
