import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LectorService } from '../../core/services/lector.service';
import { SessionService } from '../../core/services/session.service';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { OfflineQueueService } from 'src/app/core/services/offline-queue.service';

@Component({
  selector: 'app-lector',
  templateUrl: './lector.component.html',
  styleUrls: ['./lector.component.scss']
})
export class LectorComponent implements OnInit, OnDestroy {
  // Form principal
  form = this.fb.group({
    codigo_barra: ['', Validators.required],
    formato: ['CODE_128', Validators.required],
    usarJson: [true]
  });

  // Estado de UI
  scanning = false;
  lecturas: any[] = [];

  // Caja de lecturas en vivo (debajo de los botones)
  capturas: { codigo: string; formato: string; ts: string }[] = [];
  capturasText = '';

  // ZXing
  private codeReader: BrowserMultiFormatReader;
  private controls: IScannerControls | null = null;
  private wakeLock: any = null;

  constructor(
    private fb: FormBuilder,
    private geo: GeolocationService,
    private service: LectorService,
    private session: SessionService,
    private offq: OfflineQueueService   // ← aquí

  ) {
    // Hints: prioriza CODE_128 pero permite otros formatos
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE
    ]);
    this.codeReader = new BrowserMultiFormatReader(hints);
  }

  ngOnInit(): void {
    this.cargarLecturas();
    document.addEventListener('visibilitychange', this.onVisibility, false);
    addEventListener('orientationchange', () => setTimeout(() => this.restartIfNeeded(), 250));
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility, false);
    this.stopScan();
    this.releaseWakeLock();
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible') {
      if (this.scanning) this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  };

  /** Pide cámara trasera en móvil; si no, cae a primera cámara disponible */
  async startScan() {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const video = document.getElementById('preview') as HTMLVideoElement;

      this.controls = await this.codeReader.decodeFromConstraints(
        constraints,
        video,
        async (res: Result | undefined) => {
          if (res) {
            const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
            const codigo = res.getText();

            // Pinta en el form
            this.form.patchValue({ codigo_barra: codigo, formato: formatName });

            // Agrega a la caja con meta (fecha/hora local, tz, user, device, coords)
            await this.agregarCapturaConMeta(codigo, formatName);

            // Si quieres lectura continua, comenta esta línea:
            this.stopScan();
          }
        }
      );

      this.scanning = true;
      await this.requestWakeLock();

      // Intento de enfoque continuo (opcional)
      setTimeout(async () => {
        try {
          const stream = video.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks?.()[0];
          if (track?.applyConstraints) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' as any }] } as any);
          }
        } catch {
          /* ignorar si no es compatible */
        }
      }, 400);

    } catch (e) {
      console.error(e);
      alert('No se pudo iniciar la cámara. Permisos o dispositivo no disponible.');
      this.scanning = false;
      this.stopScan();
      this.releaseWakeLock();
    }
  }

  private async switchToDevice(deviceId: string) {
    const video = document.getElementById('preview') as HTMLVideoElement;
    this.controls?.stop();
    this.controls = await this.codeReader.decodeFromVideoDevice(
      deviceId,
      video,
      async (res: Result | undefined) => {
        if (res) {
          const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
          const codigo = res.getText();

          this.form.patchValue({ codigo_barra: codigo, formato: formatName });
          await this.agregarCapturaConMeta(codigo, formatName);

          this.stopScan();
        }
      }
    );
  }

  stopScan() {
    if (this.controls) {
      this.controls.stop();
      this.controls = null;
    }
    this.scanning = false;
    this.releaseWakeLock();
  }

  private async requestWakeLock() {
    try {
      // Screen Wake Lock (no todos los navegadores lo soportan)
      // @ts-ignore
      if ('wakeLock' in navigator && !this.wakeLock) {
        // @ts-ignore
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener?.('release', () => (this.wakeLock = null));
      }
    } catch { /* ignore */ }
  }
  private releaseWakeLock() {
    try { this.wakeLock?.release?.(); } catch { /* ignore */ }
    this.wakeLock = null;
  }

  private restartIfNeeded() {
    if (this.scanning) {
      this.stopScan();
      this.startScan();
    }
  }

  /** Guarda la lectura actual con meta extendido (fecha/hora local, tz, coords, user, device) */

  /** Guardar lectura con meta extendido + cola offline */
  async guardar() {
    if (!this.session.isActive()) return alert('No hay sesión activa');
    if (this.form.invalid) return;

    const user = this.session.getUsuario() || 'N/D';
    const meta = await this.geo.getCurrentRich(user);
    const coordenadas_hora = this.geo.makeJsonString(meta);

    const payload = {
      codigo_barra: this.form.value.codigo_barra!,
      formato_barcode: this.form.value.formato!,
      coordenadas_hora,
      id_sesion: this.session.getIdSesion()!,
      estado: 1
    };

    // ⬇️ INYECTA OfflineQueueService en el constructor como `private offq: OfflineQueueService`
    if (!(navigator.onLine)) {
      this.offq.enqueueLector(payload);
      alert('Sin conexión: lectura guardada en cola offline.');
      return;
    }

    this.service.guardarLectura(payload).subscribe({
      next: _ => { alert('Lectura guardada'); this.cargarLecturas(); },
      error: err => {
        if (err?.status === 0) {
          this.offq.enqueueLector(payload);
          alert('Problema de red: lectura en cola offline.');
        } else {
          alert('Error guardando lectura');
        }
      }
    });
  }


  cargarLecturas() {
    this.service.obtenerLecturas().subscribe(r => {
      this.lecturas = (r.data as any[]) || [];
    });
  }

  /** Agrega a la caja en vivo usando meta (fecha/hora local + tz, coords, user, device) */
  private async agregarCapturaConMeta(codigo: string, formato: string) {
    const user = this.session.getUsuario() || 'N/D';
    const meta = await this.geo.getCurrentRich(user);
    // Mostramos solo timestamp con tz en la caja:
    const tsFull = `${meta.ts} ${meta.tzOffset}`;
    this.capturas.unshift({ codigo, formato, ts: tsFull });
    this.capturasText = this.capturas
      .map(x => `[${x.ts}] ${x.formato}: ${x.codigo}`)
      .join('\n');
  }

  limpiarCapturas() {
    this.capturas = [];
    this.capturasText = '';
  }

  async copiarCapturas() {
    try {
      await navigator.clipboard.writeText(this.capturasText || '');
      alert('Lecturas copiadas al portapapeles');
    } catch {
      alert('No se pudo copiar. Permite acceso al portapapeles.');
    }
  }
}
