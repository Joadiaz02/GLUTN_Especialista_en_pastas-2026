import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular';

import { Auth } from '../../services/auth/auth';
import { ADMIN_MODULES } from './data/admin.modules';
import { AdminModule } from '@app/models/admin.model';
import { AdminModuleCardComponent } from '@app/components/admin-module-card/admin-module-card.component';

import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { HeaderComponent } from '@app/components/ui';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    AdminModuleCardComponent,
    RouterLink,
    ConfirmDialogComponent,
    ConfirmVolverComponent,
    HeaderComponent
],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage  {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  modulosVisibles: AdminModule[] = [];

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  ionViewWillEnter(): void {
  void this.cargarModulos();
}

private async cargarModulos(): Promise<void> {
  // Evitar mostrar módulos del usuario anterior
  this.modulosVisibles = [];

  const usuario = await this.auth.obtenerUsuarioActual();

  if (!usuario) {
    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
    return;
  }

  const perfil = this.auth.obtenerPerfil(usuario);

  if (!perfil) {
    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
    return;
  }

  this.modulosVisibles = ADMIN_MODULES.filter(
    modulo => modulo.roles.includes(perfil)
  );

  this.cdr.detectChanges();
}

  seleccionarModulo(modulo: AdminModule): void {
    console.log('Módulo seleccionado:', modulo);
  }

  volver(): void {
    console.log('qwe');
    void this.router.navigate(['/seleccion-acceso']);
  }

async cerrarSesion(): Promise<void> {
  localStorage.removeItem('token');
  localStorage.removeItem('mesa');

  try {
    await this.auth.logout();

    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}
}
