import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(
    public session: SessionService,
    private auth: AuthService,
    private router: Router
  ) {}
  finalizar() {
    const id = this.session.getIdSesion();
    if (!id) return;
    this.auth.finalizarSesion(id).subscribe({
      next: _ => { this.session.clearSession(); this.router.navigate(['/login']); },
      error: _ => { this.session.clearSession(); this.router.navigate(['/login']); }
    });
  }
}
