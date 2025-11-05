import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}
  canActivate(): boolean {
    if (this.session.isActive()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}
