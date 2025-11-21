import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionService } from '../services/session.service';
 
const JDE_BASE = 'https://hamejdeorchpy.endtoend.com.mx/jderest/orchestrator';
 
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private session: SessionService) {}
 
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.session.getToken();
 
    // ⛔ No meter Bearer a las llamadas JDE
    if (token && !req.url.startsWith(JDE_BASE)) {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      return next.handle(cloned);
    }
 
    return next.handle(req);
  }
}