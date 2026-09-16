import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Confirm } from '@app/services';

@Component({
  selector: 'app-menu-card',
  templateUrl: './menu-card.component.html',
  styleUrls: ['./menu-card.component.scss'],
  imports: [CommonModule, RouterLink],
})
export class MenuCardComponent {
  menu = input<any>();

  editLink = input<any[] | string>();

  suggested = output<boolean>();
  deleted = output<boolean>();
  reactivated = output<boolean>();

  private _confirm = inject(Confirm);

  async onToggleSuggested() {
    const activate = !this.menu().sugerencia;

    const confirmed = await this._confirm.preguntar({
      titulo: activate ? '¿Marcar como destacado?' : '¿Quitar de destacados?',
      mensaje: activate
        ? `"${
            this.menu().nombre
          }" va a aparecer en el slide de productos destacados del inicio.`
        : `"${
            this.menu().nombre
          }" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activate ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activate ? 'star' : 'star-outline',
    });

    if (!confirmed) return;

    this.suggested.emit(activate);
  }

  async onDelete() {
    const confirmed = await this._confirm.preguntar({
      titulo: '¿Dar de baja la bebida?',
      mensaje: `"${
        this.menu().nombre
      }" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmed) return;

    this.deleted.emit(confirmed);
  }

  async onReactivate() {
    const confirmed = await this._confirm.preguntar({
      titulo: '¿Reactivar la bebida?',
      mensaje: `"${this.menu().nombre}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmed) return;

    this.reactivated.emit(confirmed);
  }
}
