import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LectorService } from '../../core/services/lector.service';
import { SessionService } from '../../core/services/session.service';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result, BarcodeFormat } from '@zxing/library';
import { CacheService } from '../../core/services/cache.service';
import { Subscription } from 'rxjs';

const CACHE_KEY = 'form_lector_v1';

@Component({
  selector: 'app-lector',
  templateUrl: './lector.component.html',
  styleUrls: ['./lector.component.scss']
})
export class LectorComponent implements OnInit, OnDestroy {
  form = this.fb.group({
    codigo_barra: ['', Validators.required],
    formato: ['CODE_128', Validators.required],
    usarJson: [true]
  });

  scanning = false;
  lecturas: any[] = [];

  private codeReader = new BrowserMultiFormatReader();
  private controls: IScannerControls | null = null;
  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private geo: GeolocationService,
    private service: LectorService,
    private session: SessionService,
    private cache: CacheService
  ) {}

  ngOnInit(): void {
    // Restaurar borrador si existe
    const draft = this.cache.get(CACHE_KEY, null as any);
    if (draft) this.form.patchValue(draft, { emitEvent: false });

    // Guardar borrador en cambios (con pequeño debounce)
    let t: any;
    this.subs.add(
      this.form.valueChanges.subscribe(v => {
        clearTimeout(t);
        t = setTimeout(() => this.cache.set(CACHE_KEY, v), 200);
      })
    );

    this.cargarLecturas();
  }

  ngOnDestroy(): void {
    if (this.scanning) this.stopScan();
    this.subs.unsubscribe();
    this.cache.set(CACHE_KEY, this.form.value);
  }

  async startScan() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const deviceId = cameras[0]?.deviceId;
      const videoElem = document.getElementById('preview') as HTMLVideoElement;

      this.controls = await this.codeReader.decodeFromVideoDevice(
        deviceId,
        videoElem,
        (res: Result | undefined) => {
          if (res) {
            const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
            this.form.patchValue({
              codigo_barra: res.getText(),
              formato: formatName
            });
            this.stopScan();
          }
        }
      );

      this.scanning = true;
    } catch (e) {
      console.error(e);
      this.scanning = false;
      this.stopScan();
      alert('No se pudo iniciar la cámara/escáner');
    }
  }

  stopScan() {
    if (this.controls) {
      this.controls.stop();
      this.controls = null;
    }
    this.scanning = false;
  }

  async guardar() {
    if (!this.session.isActive()) return alert('No hay sesión activa');
    if (this.form.invalid) return;

    const { lat, lon, ts } = await this.geo.getCurrent();
    const usarJson = this.form.value.usarJson;
    const coordenadas_hora = usarJson
      ? this.geo.makeJsonString(lat, lon, ts)
      : this.geo.makeTupleString(lat, lon, ts);

    this.service.guardarLectura({
      codigo_barra: this.form.value.codigo_barra!,
      formato_barcode: this.form.value.formato!,
      coordenadas_hora,
      id_sesion: this.session.getIdSesion()!,
      estado: 1
    }).subscribe({
      next: _ => {
        alert('Lectura guardada');
        this.cargarLecturas();
        // Si prefieres limpiar y quitar borrador después de guardar:
        // this.form.patchValue({ codigo_barra: '' }, { emitEvent: true });
        // this.cache.remove(CACHE_KEY);
      },
      error: _ => alert('Error guardando lectura')
    });
  }

  cargarLecturas() {
    this.service.obtenerLecturas().subscribe(r => {
      this.lecturas = (r.data as any[]) || [];
    });
  }
}
