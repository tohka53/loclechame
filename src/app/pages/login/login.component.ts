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
    id_usuario: ['', Validators.required],
    contra: ['', [Validators.required, Validators.minLength(4)]],
    token_jwt: [{ value: '', disabled: true }]
  });

  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public session: SessionService
  ) {}

  ngOnInit(): void {
    // si ya hay sesión activa, muestra el token actual
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

      // ejemplo simple de validación (puedes reemplazar con tu backend)
      if (contra !== '1234' && contra.length < 4) {
        this.error = 'Contraseña incorrecta.';
        this.loading = false;
        return;
      }

      // genera id_sesion + token aleatorio automáticamente
      this.session.loginMock(usuario);

      // muestra el JWT generado
      this.form.get('token_jwt')?.setValue(this.session.getToken() || '');

      // redirige a dashboard o lector
      this.router.navigate(['/lector']);
    } catch (e) {
      console.error(e);
      this.error = 'Error al iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}
