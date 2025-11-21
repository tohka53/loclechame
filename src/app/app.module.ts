import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LectorComponent } from './pages/lector/lector.component';
import { LocalizadorComponent } from './pages/localizador/localizador.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SessionBadgeComponent } from './shared/components/session-badge/session-badge.component';

import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthGuard } from './core/guards/auth.guard';

import { APP_INITIALIZER } from '@angular/core';
import { SessionService } from './core/services/session.service';


export function restoreSessionFactory(session: SessionService) {
  return () => session.restore();
}


@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    LectorComponent,
    LocalizadorComponent,
    NotFoundComponent,
    NavbarComponent,
    SessionBadgeComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
   { provide: APP_INITIALIZER, useFactory: restoreSessionFactory, deps: [SessionService], multi: true },
    { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthInterceptor },
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
