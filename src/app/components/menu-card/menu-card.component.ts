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
  id = input<string>();
  name = input<string>();
  description = input<string>();
  price = input<number>();
  image = input<string>();
  suggested = input<boolean>();
  disabled = input<boolean>();

  editLink = input<any[] | string>();

  suggestClick = output<void>();
  deleteClick = output<void>();
  reactivateClick = output<void>();

  private _confirm = inject(Confirm);

  async onToggleSuggested() {
    const activate = !this.suggested();

    const confirmed = await this._confirm.preguntar({
      titulo: activate ? '¿Marcar como destacado?' : '¿Quitar de destacados?',
      mensaje: activate
        ? `"${this.name()}" va a aparecer en el slide de productos destacados del inicio.`
        : `"${this.name()}" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activate ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activate ? 'star' : 'star-outline',
    });

    if (!confirmed) return;

    this.suggestClick.emit();
  }

  async onDelete() {
    const confirmed = await this._confirm.preguntar({
      titulo: '¿Dar de baja la bebida?',
      mensaje: `"${this.name()}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmed) return;

    this.deleteClick.emit();
  }

  async onReactivate() {
    const confirmed = await this._confirm.preguntar({
      titulo: '¿Reactivar la bebida?',
      mensaje: `"${this.name()}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmed) return;

    this.reactivateClick.emit();
  }
}
