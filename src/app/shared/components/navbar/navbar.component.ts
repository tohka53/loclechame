// src/app/shared/components/navbar/navbar.component.ts
import { Component } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  menuOpen = false;

  constructor(public session: SessionService) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScroll();
  }

  closeMenu() {
    this.menuOpen = false;
    this.updateBodyScroll();
  }

  finalizar() {
    this.session.finalizarSesion();
  }

  // ✅ Prevenir scroll del body cuando el menú está abierto
  private updateBodyScroll() {
    if (this.menuOpen) {
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }
  }
}