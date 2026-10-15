import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonTitle, IonButton, IonIcon, IonRouterOutlet, NavController } from '@ionic/angular';
import { ConfirmVolverComponent } from '../confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '../confirm-cartel/confirm-cartel.component';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '@app/services';
import { SpinnerLogoComponent } from '../spinner-logo/spinner-logo.component';

// header común con volver y cerrar sesión
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    ConfirmDialogComponent,
    IonTitle,
    IonButton,
    IonIcon,
    SpinnerLogoComponent
],
})
export class HeaderComponent implements OnInit {
  private _auth = inject(Auth);
  private _router = inject(Router);
  private _routerOutlet = inject(IonRouterOutlet, { optional: true });
  private _navCtrl = inject(NavController);

  loading = signal(false);
  backHref = input('/');

  title = input('');
  action = input<'none' | 'logout' | 'add'>('none');
  routeName = input('');

  routeBackName = input('');

  mostrarVolver = input(true);
  tituloVolver = input('¿Quieres volver?');
  mensajeVolver = input('');
  textoConfirmarVolver = input('Confirmar');
  colorConfirmarVolver = input<'danger' | 'primary'>('danger');

  mostrarCerrarSesion = input(true);

  volver = output<void>();
  cerrarSesion = output<void>();

  async ngOnInit() {
    await this.cargarModulos();
  }

  private async cargarModulos(): Promise<void> {
    const usuario = await this._auth.obtenerUsuarioActual();

    console.log('========== ADMIN HEADERRRRRRRR ==========');
    console.log('Usuario:', usuario);
    console.log('Metadata:', usuario?.user_metadata);

    if (!usuario) {
      console.log('NO HAY USUARIO');
      await this._router.navigate(['/login']);

      return;
    }

    const perfil = this._auth.obtenerPerfil(usuario);

    console.log('Perfil obtenido:', perfil);
    // console.log('Módulos disponibles:', ADMIN_MODULES);

    if (!perfil) {
      console.log('NO HAY PERFIL');
      await this._router.navigate(['/login']);
      
      return;
    }

    // this.modulosVisibles = ADMIN_MODULES.filter((modulo) =>
    //   modulo.roles.includes(perfil)
    // );

    // console.log('Módulos visibles:', this.modulosVisibles);

    // this.cdr.detectChanges();
  }
  
  async onBack() {
    await this._router.navigate([this.routeBackName()]);
    // if (this._routerOutlet?.canGoBack()) {
    //   this._navCtrl.back();
    // } else {
    //   await this._navCtrl.navigateBack(this.backHref());
    // }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');
    
    this.loading.set(true)
    
    await this._auth.logout();
    
    await this._router.navigate(['/login']);
    
    this.loading.set(false)
  }
}
