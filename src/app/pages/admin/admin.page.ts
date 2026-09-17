import { Component, OnInit, ChangeDetectorRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';


import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonModal,
  
} from '@ionic/angular';

import { Auth } from '../../services/auth/auth';
import { ADMIN_MODULES } from './data/admin.modules';
import { AdminModule } from '@app/models/admin.model';
import { AdminModuleCardComponent } from '@app/components/admin-module-card/admin-module-card.component';

import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ConfirmVolverComponent } from "@app/components/ui/confirm-volver/confirm-volver.component";

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    AdminModuleCardComponent,
    RouterLink,
  
    ConfirmDialogComponent,
    ConfirmVolverComponent
],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
  modulosVisibles: AdminModule[] = [];
  
  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    
    
  ) {
    addIcons({
    'log-out-outline': logOutOutline
  });
  }

  ngOnInit(): void {
    void this.cargarModulos();
  }

  private async cargarModulos(): Promise<void> {
    const usuario = await this.auth.obtenerUsuarioActual();

    console.log('========== ADMIN ==========');
    console.log('Usuario:', usuario);
    console.log('Metadata:', usuario?.user_metadata);

    if (!usuario) {
      console.log('NO HAY USUARIO');
      await this.router.navigate(['/login']);
      return;
    }

    const perfil = this.auth.obtenerPerfil(usuario);

    console.log('Perfil obtenido:', perfil);
    console.log('Módulos disponibles:', ADMIN_MODULES);

    if (!perfil) {
      console.log('NO HAY PERFIL');
      await this.router.navigate(['/login']);
      return;
    }

    this.modulosVisibles = ADMIN_MODULES.filter((modulo) =>
      modulo.roles.includes(perfil)
    );

    console.log('Módulos visibles:', this.modulosVisibles);

    this.cdr.detectChanges();
  }

  seleccionarModulo(modulo: AdminModule): void {
    console.log('Módulo seleccionado:', modulo);
  }

  volver(): void {
    
    void this.router.navigate(['/seleccion-acceso']);
  }


  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
    
  }
}
