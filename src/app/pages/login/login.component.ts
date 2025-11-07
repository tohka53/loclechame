import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form = this.fb.group({
    id_usuario: ['', [Validators.required, Validators.minLength(3)]],
    contra: ['', [Validators.required, Validators.minLength(4)]],
    // JWT oculto: lo llenamos al iniciar sesión, pero no se muestra en pantalla
    token_jwt: ['']
  });

  loading = false;
  error: string | null = null;
  showPass = false; // para alternar ver/ocultar contraseña (opcional)

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public session: SessionService
  ) {}

  ngOnInit(): void {
    // si ya hay sesión activa, mantenemos el token en el form (oculto)
    if (this.session.isActive()) {
      this.form.get('token_jwt')?.setValue(this.session.getToken() || '');
    }
  }

  submit() {
    this.error = null;
    if (this.form.invalid) {
      this.error = 'Por favor completa usuario y contraseña.';
      return;
    }
    this.loading = true;

    try {
      const usuario = this.form.get('id_usuario')!.value!.trim();
      const contra = this.form.get('contra')!.value!.trim();

      // 🔐 Validación mock local (sustituible por backend real)
      // Acepta si la contraseña es "1234" o si tiene >= 4 caracteres
      if (contra !== '1234' && contra.length < 4) {
        this.error = 'Usuario o contraseña inválidos.';
        this.loading = false;
        return;
      }

      // Crea sesión e inyecta un JWT aleatorio (oculto en UI)
      this.session.loginMock(usuario);
      this.form.get('token_jwt')?.setValue(this.session.getToken() || '');

      // Redirige (ajusta la ruta si prefieres)
      this.router.navigate(['/lector']);
    } catch (e) {
      console.error(e);
      this.error = 'Error al iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }

  toggleShowPass() {
    this.showPass = !this.showPass;
  }
}
