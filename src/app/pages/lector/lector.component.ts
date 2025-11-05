import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LectorService } from '../../core/services/lector.service';
import { SessionService } from '../../core/services/session.service';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result, BarcodeFormat, DecodeHintType } from '@zxing/library';

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

  private codeReader: BrowserMultiFormatReader;
  private controls: IScannerControls | null = null;
  private wakeLock: any = null;

  constructor(
    private fb: FormBuilder,
    private geo: GeolocationService,
    private service: LectorService,
    private session: SessionService
  ) {
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
      (res: Result | undefined) => {
        if (res) {
          const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
          this.form.patchValue({ codigo_barra: res.getText(), formato: formatName });
          this.stopScan(); // quítalo si quieres lectura continua
        }
      }
    );

    this.scanning = true;
    await this.requestWakeLock();

    // 🔧 Intentar enfoque continuo (opcional y con fallback)
    setTimeout(async () => {
      try {
        const stream = video.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks?.()[0];
        if (track?.applyConstraints) {
          // Algunos navegadores aceptan 'focusMode' vía advanced; otros lo ignoran sin romper.
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
    this.controls = await this.codeReader.decodeFromVideoDevice(deviceId, video, (res: Result | undefined) => {
      if (res) {
        const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
        this.form.patchValue({ codigo_barra: res.getText(), formato: formatName });
        this.stopScan();
      }
    });
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
      next: _ => { alert('Lectura guardada'); this.cargarLecturas(); },
      error: _ => alert('Error guardando lectura')
    });
  }

  cargarLecturas() {
    this.service.obtenerLecturas().subscribe(r => {
      this.lecturas = (r.data as any[]) || [];
    });
  }

  // dentro de la clase LectorComponent:
capturas: { codigo: string; formato: string; ts: string }[] = [];
capturasText = '';

private agregarCaptura(codigo: string, formato: string) {
  const ts = new Date(); // o usa tu GeolocationService si quieres la hora local exacta
  const pad = (n: number) => String(n).padStart(2, '0');
  const tsStr = `${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;

  this.capturas.unshift({ codigo, formato, ts: tsStr });
  // pinta como líneas de texto (última arriba)
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
