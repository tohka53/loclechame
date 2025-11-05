import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form = this.fb.group({
    id_usuario: ['', Validators.required],
    token_jwt: ['', Validators.required]
  });
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private session: SessionService,
    private router: Router
  ) {}

  submit() {
    this.error = null;
    if (this.form.invalid) return;
    this.loading = true;
    const { id_usuario, token_jwt } = this.form.value;
    this.auth.iniciarSesion(id_usuario!, token_jwt!).subscribe({
      next: sess => { this.session.setSession(sess); this.router.navigate(['/']); },
      error: _ => { this.error = 'No se pudo iniciar sesión'; },
      complete: () => this.loading = false
    });
  }
}
