import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LectorService } from '../../core/services/lector.service';
import { SessionService } from '../../core/services/session.service';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
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
  
  private codeReader: BrowserMultiFormatReader;
  private controls: IScannerControls | null = null;
  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private geo: GeolocationService,
    private service: LectorService,
    private session: SessionService,
    private cache: CacheService
  ) {
    // Configurar el lector con hints específicos para Code 128
    const hints = new Map();
    
    // Habilitar todos los formatos de Code 128 (incluye Subset A, B, C)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE
    ]);
    
    // Intentar más duro para encontrar códigos de barras
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    // Asumir que el código está en posición correcta (no invertido)
    hints.set(DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, false);
    
    this.codeReader = new BrowserMultiFormatReader(hints);
  }

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
      
      // Preferir cámara trasera si está disponible
      let deviceId = cameras.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('trasera')
      )?.deviceId || cameras[0]?.deviceId;

      if (!deviceId) {
        throw new Error('No se encontró ninguna cámara');
      }

      const videoElem = document.getElementById('preview') as HTMLVideoElement;
      
      this.controls = await this.codeReader.decodeFromVideoDevice(
        deviceId,
        videoElem,
        (res: Result | undefined, error?: any) => {
          if (res) {
            const formatName = BarcodeFormat[res.getBarcodeFormat()] ?? 'UNKNOWN';
            const barcode = res.getText();
            
            console.log('Código detectado:', barcode);
            console.log('Formato:', formatName);
            
            this.form.patchValue({
              codigo_barra: barcode,
              formato: formatName
            });
            
            // Opcional: detener automáticamente después de detectar
            this.stopScan();
          }
          
          if (error && !(error.name === 'NotFoundException')) {
            console.error('Error en escaneo:', error);
          }
        }
      );
      
      this.scanning = true;
      
    } catch (e) {
      console.error('Error iniciando cámara:', e);
      this.scanning = false;
      this.stopScan();
      alert('No se pudo iniciar la cámara/escáner: ' + (e as Error).message);
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
    if (!this.session.isActive()) {
      alert('No hay sesión activa');
      return;
    }
    
    if (this.form.invalid) {
      alert('Formulario inválido. Por favor complete los campos requeridos.');
      return;
    }

    try {
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
          alert('Lectura guardada exitosamente');
          this.cargarLecturas();
          
          // Opcional: limpiar formulario después de guardar
          this.form.patchValue({ 
            codigo_barra: '',
            formato: 'CODE_128'
          }, { emitEvent: true });
        },
        error: err => {
          console.error('Error guardando lectura:', err);
          alert('Error guardando lectura: ' + (err.message || 'Error desconocido'));
        }
      });
    } catch (error) {
      console.error('Error obteniendo geolocalización:', error);
      alert('Error obteniendo ubicación. Por favor active los permisos de ubicación.');
    }
  }

  cargarLecturas() {
    this.service.obtenerLecturas().subscribe({
      next: r => {
        this.lecturas = (r.data as any[]) || [];
      },
      error: err => {
        console.error('Error cargando lecturas:', err);
      }
    });
  }
}