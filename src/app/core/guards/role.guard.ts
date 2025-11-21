import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * 🔒 Guard para control de acceso basado en roles
 * 
 * Usuarios especiales (99570, 186943, 202620):
 *   - Solo acceso a /localizador
 *   - Bloqueados de /lector
 * 
 * Usuarios normales:
 *   - Solo acceso a /lector
 *   - Bloqueados de /localizador
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  
  // ✅ Usuarios que SOLO pueden ver el localizador
  private readonly usuariosLocalizador = ['99570', '186943', '202620'];

  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Obtener usuario de la sesión actual
    const sesion = this.sessionService.get();
    const usuario = sesion?.id_usuario;

    // ❌ Sin sesión → Login
    if (!usuario) {
      console.warn('🔒 RoleGuard: No hay sesión activa, redirigiendo a /login');
      this.router.navigate(['/login']);
      return false;
    }

    // Determinar tipo de ruta y tipo de usuario
    const requiereLocalizador = route.data?.['requiereLocalizador'] === true;
    const esUsuarioLocalizador = this.usuariosLocalizador.includes(usuario);

    console.log('🔍 RoleGuard verificando acceso:');
    console.log('   Usuario:', usuario);
    console.log('   Ruta requiere localizador:', requiereLocalizador);
    console.log('   Es usuario localizador:', esUsuarioLocalizador);

    // ❌ Usuario de localizador intenta acceder al lector
    if (!requiereLocalizador && esUsuarioLocalizador) {
      console.warn(`⚠️ RoleGuard: Usuario ${usuario} intentó acceder a /lector (bloqueado)`);
      console.warn('   Redirigiendo a /localizador');
      this.router.navigate(['/localizador']);
      return false;
    }

    // ❌ Usuario normal intenta acceder al localizador
    if (requiereLocalizador && !esUsuarioLocalizador) {
      console.warn(`⚠️ RoleGuard: Usuario ${usuario} intentó acceder a /localizador (bloqueado)`);
      console.warn('   Redirigiendo a /lector');
      this.router.navigate(['/lector']);
      return false;
    }

    // ✅ Usuario con permisos correctos
    console.log(`✅ RoleGuard: Acceso permitido para ${usuario} a ${requiereLocalizador ? '/localizador' : '/lector'}`);
    return true;
  }
}