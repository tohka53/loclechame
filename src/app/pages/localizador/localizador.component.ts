import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { LocalizadorService } from '../../core/services/localizador.service';
import { JdeService, Unidad, Predio, Piloto } from '../../core/services/jde.service';

interface LocalInfo {
  placa_cabezal: string;
  id_predio: string;
  nombre_piloto?: string;
}

@Component({
  selector: 'app-localizador',
  templateUrl: './localizador.component.html',
  styleUrls: ['./localizador.component.scss']
})
export class LocalizadorComponent implements OnInit {
  
  // ✅ Formularios reactivos
  form!: FormGroup;
  transportistaForm!: FormGroup;
  
  // ✅ Controles de búsqueda para autocomplete
  placaSearchCtrl = new FormControl('');
  predioSearchCtrl = new FormControl('');
  
  // ✅ Estados de UI
  loading = false;
  loadingApis = false;
  formError: string | null = null;
  coordenadasHora = '';
  
  // ✅ Modal de transportista
  showTransportistaModal = false;
  codTransportista: string | null = null;
  localInfo: LocalInfo | null = null;
  
  // ✅ Datos de geolocalización
  private coordenadas: { lat: number; lng: number; precision?: number } | null = null;
  
  // ✅ Catálogos de JDE
  unidades: Unidad[] = [];
  predios: Predio[] = [];
  
  // ✅ Listas filtradas para autocomplete
  filteredUnidades: Unidad[] = [];
  filteredPredios: Predio[] = [];
  
  // ✅ Control de dropdowns
  showPlacaDropdown = false;
  showPredioDropdown = false;

  constructor(
    private fb: FormBuilder,
    private sessionService: SessionService,
    private localizadorService: LocalizadorService,
    private jdeService: JdeService
  ) {}

  ngOnInit(): void {
    this.inicializarFormularios();
    this.solicitarGeolocalizacion();
    this.configurarAutocomplete();
    
    // ✅ SIEMPRE usar el usuario logueado como transportista
    const sesion = this.sessionService.get();
    if (sesion?.id_usuario) {
      const usuariosLocalizador = ['99570', '186943', '202620'];
      
      if (usuariosLocalizador.includes(sesion.id_usuario)) {
        // ✅ IMPORTANTE: Siempre usar el usuario actual, no el guardado
        this.codTransportista = sesion.id_usuario;
        this.transportistaForm.patchValue({ codigo: sesion.id_usuario });
        
        // Guardar en localStorage para referencia
        localStorage.setItem('localizador_transportista', sesion.id_usuario);
        
        // Cargar catálogos con el usuario actual
        this.cargarCatalogos(sesion.id_usuario);
      }
    }
  }

  /**
   * Inicializa los formularios reactivos
   */
  private inicializarFormularios(): void {
    // Formulario principal
    this.form = this.fb.group({
      placa_cabezal: ['', Validators.required],
      id_predio: [''],
      nombre_piloto: [''],
      estado: ['INICIO_RUTA', Validators.required],
      notas: ['']
    });

    // Formulario del modal de transportista
    this.transportistaForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  /**
   * Configura los listeners para el autocomplete
   */
  private configurarAutocomplete(): void {
    // Filtrado de unidades
    this.placaSearchCtrl.valueChanges.subscribe(search => {
      const term = (search || '').toLowerCase().trim();
      if (!term) {
        this.filteredUnidades = this.unidades;
      } else {
        this.filteredUnidades = this.unidades.filter(u =>
          u.codigo.toLowerCase().includes(term) ||
          u.tipo.toLowerCase().includes(term)
        );
      }
    });

    // Filtrado de predios
    this.predioSearchCtrl.valueChanges.subscribe(search => {
      const term = (search || '').toLowerCase().trim();
      if (!term) {
        this.filteredPredios = this.predios;
      } else {
        this.filteredPredios = this.predios.filter(p =>
          p.codigo.toLowerCase().includes(term) ||
          p.nombre.toLowerCase().includes(term)
        );
      }
    });
  }

  /**
   * Solicita permisos de geolocalización
   */
  private solicitarGeolocalizacion(): void {
    if (!navigator.geolocation) {
      this.formError = 'Tu navegador no soporta geolocalización';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.coordenadas = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          precision: position.coords.accuracy
        };

        const fecha = new Date();
        this.coordenadasHora = `${this.coordenadas.lat.toFixed(6)}, ${this.coordenadas.lng.toFixed(6)} (${fecha.toLocaleString()})`;
        
        console.log('✅ Coordenadas obtenidas:', this.coordenadas);
      },
      (error) => {
        console.error('❌ Error geolocalización:', error);
        this.formError = `Error al obtener ubicación: ${error.message}`;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // ========== MODAL DE TRANSPORTISTA ==========

  abrirModalTransportista(): void {
    this.showTransportistaModal = true;
    
    // ✅ Si ya hay código de transportista, mostrarlo
    if (this.codTransportista) {
      this.transportistaForm.patchValue({ codigo: this.codTransportista });
    } else {
      // ✅ Si no hay código, usar el usuario actual de la sesión
      const sesion = this.sessionService.get();
      if (sesion?.id_usuario) {
        this.transportistaForm.patchValue({ codigo: sesion.id_usuario });
      }
    }
  }

  cerrarModalTransportista(): void {
    this.showTransportistaModal = false;
  }

  cerrarModalSiClickFuera(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cerrarModalTransportista();
    }
  }

  confirmarTransportista(): void {
    if (this.transportistaForm.invalid) return;

    const sesion = this.sessionService.get();
    const codigo = this.transportistaForm.value.codigo.trim();
    
    // ✅ VALIDACIÓN: Solo permitir el código del usuario actual
    if (sesion?.id_usuario && codigo !== sesion.id_usuario) {
      alert(`⚠️ Solo puedes usar tu propio código de transportista: ${sesion.id_usuario}`);
      this.transportistaForm.patchValue({ codigo: sesion.id_usuario });
      return;
    }
    
    this.codTransportista = codigo;
    
    // Guardar en localStorage
    localStorage.setItem('localizador_transportista', codigo);
    
    this.cerrarModalTransportista();
    this.cargarCatalogos(codigo);
  }

  // ========== CATÁLOGOS JDE ==========

  private cargarCatalogos(codTransportista: string): void {
    this.loadingApis = true;
    
    // Limpiar formulario
    this.form.reset({ estado: 'INICIO_RUTA' });
    this.placaSearchCtrl.setValue('');
    this.predioSearchCtrl.setValue('');
    
    let completados = 0;
    const total = 2;

    // Cargar unidades
    this.jdeService.getUnidadesPorTransportista(codTransportista).subscribe({
      next: (data) => {
        this.unidades = data;
        this.filteredUnidades = data;
        console.log('✅ Unidades cargadas:', data.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar unidades:', err);
        alert('Error al cargar unidades de transporte');
      },
      complete: () => {
        completados++;
        if (completados === total) this.loadingApis = false;
      }
    });

    // Cargar predios
    this.jdeService.getPrediosPorTransportista(codTransportista).subscribe({
      next: (data) => {
        this.predios = data;
        this.filteredPredios = data;
        console.log('✅ Predios cargados:', data.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar predios:', err);
      },
      complete: () => {
        completados++;
        if (completados === total) this.loadingApis = false;
      }
    });
  }

  // ========== AUTOCOMPLETE DE PLACA ==========

  onPlacaFocus(): void {
    this.showPlacaDropdown = true;
  }

  onPlacaBlur(): void {
    setTimeout(() => {
      this.showPlacaDropdown = false;
    }, 200);
  }

  selectUnidad(unidad: Unidad): void {
    this.form.patchValue({ placa_cabezal: unidad.codigo });
    this.placaSearchCtrl.setValue(`${unidad.codigo} • ${unidad.tipo}`, { emitEvent: false });
    this.showPlacaDropdown = false;
    
    // Buscar piloto para esta unidad
    this.buscarPiloto(unidad.codigo);
  }

  private buscarPiloto(codigoUnidad: string): void {
    this.jdeService.getPilotoPorUnidad(codigoUnidad).subscribe({
      next: (piloto) => {
        if (piloto) {
          this.form.patchValue({ nombre_piloto: piloto.staffName });
          console.log('✅ Piloto encontrado:', piloto.staffName);
        } else {
          this.form.patchValue({ nombre_piloto: '' });
          console.warn('⚠️ No se encontró piloto');
        }
      },
      error: (err) => {
        console.error('❌ Error al buscar piloto:', err);
        this.form.patchValue({ nombre_piloto: '' });
      }
    });
  }

  // ========== AUTOCOMPLETE DE PREDIO ==========

  onPredioFocus(): void {
    this.showPredioDropdown = true;
  }

  onPredioBlur(): void {
    setTimeout(() => {
      this.showPredioDropdown = false;
    }, 200);
  }

  selectPredio(predio: Predio): void {
    this.form.patchValue({ id_predio: predio.codigo });
    this.predioSearchCtrl.setValue(`${predio.codigo} • ${predio.nombre}`, { emitEvent: false });
    this.showPredioDropdown = false;
  }

  // ========== LOCAL INFO ==========

  limpiarLocalInfo(): void {
    this.localInfo = null;
    this.form.reset({ estado: 'INICIO_RUTA' });
    this.placaSearchCtrl.setValue('');
    this.predioSearchCtrl.setValue('');
  }

  // ========== GUARDAR PUNTO ==========

  obtenerCoordenadas(): { lat: number; lng: number; precision?: number } | null {
    return this.coordenadas;
  }

  async guardarPuntoDirecto(): Promise<void> {
    if (!this.form.valid) {
      this.formError = 'Por favor llena los campos obligatorios (placa cabezal y estado).';
      return;
    }

    const coords = this.obtenerCoordenadas();
    if (!coords) {
      this.formError = 'No se pudieron obtener las coordenadas. Intenta de nuevo.';
      return;
    }

    this.loading = true;
    this.formError = null;

    try {
      const sesion = this.sessionService.get();
      const usuarioActual = sesion?.id_usuario || 'Desconocido';

      const payload = {
        placa_cabezal: this.form.value.placa_cabezal!,
        id_predio: this.form.value.id_predio || '',
        nombre_piloto: this.form.value.nombre_piloto || '',
        transportista: this.codTransportista || usuarioActual, // ✅ Código de transportista
        coordenadas_hora: this.coordenadasHora || '',
        estado_ruta: this.form.value.estado || 'INICIO_RUTA',
        notas_ruta: this.form.value.notas || '',
        lat: coords.lat,
        lng: coords.lng,
        precision_metros: coords.precision || null,
        id_sesion: sesion?.id_sesion || null,
        usuario_registro: usuarioActual
      };

      console.log('📤 Enviando punto al backend:', payload);

      this.localizadorService.guardarPunto(payload).subscribe({
        next: (response) => {
          console.log('✅ Punto guardado:', response);
          
          if (response.ok && response.data?.idLocalizacion) {
            alert(`✅ Punto guardado correctamente (ID: ${response.data.idLocalizacion})`);
            
            // Guardar info local para mantener placa/predio/conductor
            this.localInfo = {
              placa_cabezal: this.form.value.placa_cabezal,
              id_predio: this.form.value.id_predio,
              nombre_piloto: this.form.value.nombre_piloto
            };
            
            // Solo limpiar notas y resetear estado
            this.form.patchValue({
              notas: '',
              estado: 'INICIO_RUTA'
            });
            
            // Actualizar coordenadas
            this.solicitarGeolocalizacion();
          } else {
            this.formError = response.message || 'Error desconocido al guardar';
          }
        },
        error: (err) => {
          console.error('❌ Error al guardar punto:', err);
          this.formError = err?.error?.message || 'Error al guardar el punto';
        },
        complete: () => {
          this.loading = false;
        }
      });

    } catch (error) {
      console.error('❌ Error inesperado:', error);
      this.formError = 'Error inesperado al preparar el payload';
      this.loading = false;
    }
  }
}