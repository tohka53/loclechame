// src/app/shared/components/navbar/navbar.component.ts
import { Component } from '@angular/core';
import { SessionService } from '../../../core/services/session.service'; // ojo con la ruta

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  menuOpen = false;
  constructor(public session: SessionService) {}
  toggleMenu(){ this.menuOpen = !this.menuOpen; }
  closeMenu(){ this.menuOpen = false; }
  finalizar(){ this.session.finalizarSesion(); }
}
