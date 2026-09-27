import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth, Waitlist } from '@app/services';
import { TurnRingComponent } from '@app/components';

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.page.html',
  styleUrls: ['./waiting-room.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    TurnRingComponent
],
})
export class WaitingRoomPage {
  private _router = inject(Router);
  private _authService = inject(Auth);
  private _waitlistService = inject(Waitlist);

  position = signal<number | null>(null);
  total = signal<number>(1);
  
  private _unsubscribe: (() => void) | null = null;
  private _userId = '';

  async ngOnInit() {
    const user = await this._authService.obtenerUsuarioActual();
    this._userId = user.id;

    await this._refrescar();
    this._unsubscribe = this._waitlistService.subscribeToChanges(() => this._refrescar());
  }

  ngOnDestroy() {
    this._unsubscribe?.();
  }

  private async _refrescar(): Promise<void> {
    const miEntrada = await this._waitlistService.getMyEntry(this._userId);

    if (miEntrada?.estado === 'asignado' && miEntrada.mesa_id) {
      const mesa = await this._waitlistService.getTableById(miEntrada.mesa_id);
      this._router.navigate(['/carta'], { state: { mesa } });
      return;
    }

    const [position, listaCompleta] = await Promise.all([
      this._waitlistService.getPosition(this._userId),
      this._waitlistService.getList(),
    ]);

    this.position.set(position);
    this.total.set(Math.max(listaCompleta.length, 1));
  }
}
