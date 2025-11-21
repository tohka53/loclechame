import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService, IniciarSesionRequest } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { CacheService } from '../../core/services/cache.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  submitted = false;
  errorMessage: string = '';
  showPassword = false;
  returnUrl: string = '';

  // ✅ Usuarios especiales que NO requieren validación AD
  private readonly usuariosLocalizador = ['99570', '186943', '202620'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sessionService: SessionService,
    private cacheService: CacheService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(1)]], // ← Cambio: mínimo 1 para usuarios especiales
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Limpiar transportista guardado al cargar login
    localStorage.removeItem('localizador_transportista');

    // Verificar si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.redirectToDefaultPage();
      return;
    }

    // Obtener URL de retorno
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '';
    });

    // Prellenar usuario si estaba guardado
    const rememberedUser = localStorage.getItem('remember_user');
    if (rememberedUser) {
      this.loginForm.patchValue({ 
        username: rememberedUser, 
        rememberMe: true 
      });
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.errorMessage = '';

    // Validar formulario
    if (this.loginForm.invalid) {
      this.errorMessage = 'Por favor completa usuario y contraseña correctamente.';
      return;
    }

    this.isLoading = true;

    const username = this.loginForm.get('username')!.value.trim();
    const password = this.loginForm.get('password')!.value.trim();

    try {
      // ✅ Verificar si es usuario especial
      const esUsuarioEspecial = this.usuariosLocalizador.includes(username);

      let adResponse: any;
      let id_sesion_sql: number | undefined;

      if (esUsuarioEspecial) {
        // ========================================
        // 🔓 BYPASS PARA USUARIOS ESPECIALES
        // ========================================
        console.log(`✅ Usuario especial detectado: ${username} - BYPASS de Active Directory`);
        
        // Crear respuesta mock (sin llamar a AD)
        adResponse = {
          token: this.generateMockToken(username),
          username: username,
          area: 'LOCALIZADOR',
          expiresIn: 28800 // 8 horas
        };

        console.log('✅ Token mock generado para usuario especial');
        console.log('   Username:', adResponse.username);
        console.log('   Area:', adResponse.area);

      } else {
        // ========================================
        // 🔐 AUTENTICACIÓN NORMAL (ACTIVE DIRECTORY)
        // ========================================
        console.log('🔐 Paso 1: Autenticando contra Active Directory...');
        console.log('   Usuario:', username);
        
        adResponse = await this.authService.login({ username, password })
          .toPromise();

        if (!adResponse || !adResponse.token) {
          throw new Error('Respuesta inválida del servidor de autenticación');
        }

        console.log('✅ Autenticación AD exitosa');
        console.log('   Username:', adResponse.username);
        console.log('   Area:', adResponse.area);
      }

      // ========================================
      // 2️⃣ CREAR SESIÓN EN SQL SERVER
      // ========================================
      console.log('📤 Paso 2: Creando sesión en SQL Server...');
      
      try {
        const sesionRequest: IniciarSesionRequest = {
          usuarioRegistro: adResponse.username,
          tokenJwt: adResponse.token,
          ip: null,
          userAgent: navigator.userAgent
        };

        console.log('   Request a SQL:', sesionRequest);

        const sesionResponse = await this.authService.createSqlSession(sesionRequest)
          .toPromise();

        if (sesionResponse?.ok && sesionResponse.idSesion > 0) {
          id_sesion_sql = sesionResponse.idSesion;
          console.log('✅ Sesión SQL creada exitosamente');
          console.log('   ID Sesión:', id_sesion_sql);
        } else {
          console.warn('⚠️ Respuesta de SQL sin ID de sesión:', sesionResponse);
        }
        
      } catch (sqlError: any) {
        console.error('❌ Error al crear sesión SQL:', sqlError);
        
        if (sqlError?.status === 0) {
          console.error('   Tipo: Error de conexión - API no disponible');
          this.errorMessage = 'No se puede conectar al servidor. Verifica que el API esté corriendo.';
        } else if (sqlError?.status === 404) {
          console.error('   Tipo: Endpoint no encontrado');
          this.errorMessage = 'Servicio de sesiones no disponible (404).';
        } else if (sqlError?.status === 500) {
          console.error('   Tipo: Error interno del servidor');
          console.error('   Detalle:', sqlError?.error);
          this.errorMessage = 'Error en el servidor al crear sesión.';
        } else {
          console.error('   Tipo: Error desconocido');
          this.errorMessage = `Error al crear sesión: ${sqlError?.message || 'Error desconocido'}`;
        }
        
        this.isLoading = false;
        return;
      }

      // ========================================
      // 3️⃣ GUARDAR DATOS EN LOCALSTORAGE
      // ========================================
      console.log('💾 Paso 3: Guardando datos en localStorage...');
      
      this.authService.storeUserData(
        adResponse.token,
        adResponse.username,
        adResponse.area,
        id_sesion_sql
      );

      // Compatibilidad con SessionService existente
      if (id_sesion_sql) {
        this.sessionService.set({
          id_usuario: adResponse.username,
          id_sesion: id_sesion_sql,
          token_jwt: adResponse.token
        });
        console.log('✅ SessionService actualizado');
      }

      // Limpiar cache
      this.cacheService.remove('lector_area_info_v1');
      console.log('🗑️ Cache limpiado');

      // ========================================
      // 4️⃣ MANEJAR "RECORDARME"
      // ========================================
      if (this.loginForm.get('rememberMe')?.value) {
        localStorage.setItem('remember_user', username);
        console.log('💾 Usuario guardado para recordar');
      } else {
        localStorage.removeItem('remember_user');
      }

      // ========================================
      // 5️⃣ REDIRIGIR SEGÚN PERFIL
      // ========================================
      console.log('🚀 Paso 4: Redirigiendo...');
      
      if (esUsuarioEspecial) {
        console.log(`📍 Usuario especial ${username} → /localizador`);
        this.router.navigate(['/localizador']);
      } else {
        this.redirectToDefaultPage();
      }

    } catch (error: any) {
      console.error('❌ Error general en login:', error);
      
      // Manejo específico de errores de AD
      if (error.status === 401) {
        this.errorMessage = 'Usuario o contraseña incorrectos.';
      } else if (error.status === 0) {
        this.errorMessage = 'No se puede conectar al servidor de autenticación. Verifica tu conexión.';
      } else if (error.status === 404) {
        this.errorMessage = 'Servicio de autenticación no disponible (404).';
      } else if (error.status === 500) {
        this.errorMessage = 'Error en el servidor de autenticación.';
      } else {
        this.errorMessage = error.error?.message || error.message || 'Error al iniciar sesión. Intenta nuevamente.';
      }
      
    } finally {
      this.isLoading = false;
      console.log('🏁 Proceso de login finalizado');
    }
  }

  /**
   * 🎫 Generar token mock para usuarios especiales
   */
  private generateMockToken(username: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 28800; // 8 horas
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      sub: username, 
      name: username,
      area: 'LOCALIZADOR',
      iat, 
      exp 
    }));
    const signature = btoa(`mock-signature-${username}-${iat}`);
    return `${header}.${payload}.${signature}`;
  }

  /**
   * 🎯 Redirigir según perfil del usuario
   */
  private redirectToDefaultPage(): void {
    // Si hay una URL de retorno específica, usarla
    if (this.returnUrl) {
      console.log('📍 Redirigiendo a URL de retorno:', this.returnUrl);
      this.router.navigate([this.returnUrl]);
      return;
    }

    // Sino, redirigir según perfil
    const rutaPorDefecto = this.authService.getRutaPorDefecto();
    console.log('📍 Redirigiendo a ruta por defecto:', rutaPorDefecto);
    this.router.navigate([rutaPorDefecto]);
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }
}