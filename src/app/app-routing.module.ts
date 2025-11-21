import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LectorComponent } from './pages/lector/lector.component';
import { LocalizadorComponent } from './pages/localizador/localizador.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'lector', 
    component: LectorComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { requiereLocalizador: false }  // ✅ Solo usuarios normales
  },
  { 
    path: 'localizador', 
    component: LocalizadorComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { requiereLocalizador: true }  // ✅ Solo usuarios 99570, 186943, 202620
  },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}