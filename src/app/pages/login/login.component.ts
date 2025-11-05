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

  // form con JWT fijo (readonly)
  form = this.fb.group({
    id_usuario: ['', Validators.required],
    token_jwt: [{ value: '', disabled: true }]  // visible pero solo lectura
  });

  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public session: SessionService
  ) {}

  ngOnInit(): void {
    // si ya hay sesión activa, puedes redirigir
    if (this.session.isActive()) {
      this.form.get('token_jwt')?.setValue(this.session.getToken() || '');
    }
  }

  submit() {
    this.error = null;
    if (this.form.invalid) {
      this.error = 'Ingresa tu usuario para continuar';
      return;
    }
    this.loading = true;

    try {
      const usuario = this.form.get('id_usuario')!.value!.toString().trim();
      // crea id_sesion + token aleatorio automáticamente
      this.session.loginMock(usuario);
      // muestra el JWT generado en la casilla (readonly)
      this.form.get('token_jwt')?.setValue(this.session.getToken() || '');
      this.router.navigate(['/']); // o a /lector si prefieres
    } catch (e) {
      this.error = 'No se pudo iniciar sesión.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }
}
