import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Confirm } from '@app/services';

@Component({
  selector: 'app-drink-card',
  templateUrl: './drink-card.component.html',
  styleUrls: ['./drink-card.component.scss'],
  imports: [CommonModule, RouterLink],
})
export class DrinkCardComponent {
  id = input<string>();
  name = input<string>();
  description = input<string>();
  price = input<number>();
  image = input<string>();
  sugerencia = input<boolean>();
  available = input<boolean>();

  tagText = input<string>();
  sizeText = input<string>();
  tagColor = input<string>();
  isFavorite = input<boolean>(false);

  favoriteClick = output<void>();
  editClick = output<void>();
  deleteClick = output<void>();

  private _confirm = inject(Confirm);

  async onFavorite() {
    const activar = !this.sugerencia();

    const confirmado = await this._confirm.preguntar({
      titulo: activar ? '¿Marcar como destacado?' : '¿Quitar de destacados?',
      mensaje: activar
        ? `"${this.name()}" va a aparecer en el slide de productos destacados del inicio.`
        : `"${this.name()}" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activar ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activar ? 'star' : 'star-outline',
    });

    console.log(confirmado);
  }

  onEdit() {
    this.editClick.emit();
  }

  async onDelete() {
    const confirm = await this._confirm.preguntar({
      titulo: '¿Dar de baja la bebida?',
      mensaje: `"${this.name()}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    console.log(confirm);

    // if (!confirmado) return;

    try {
      // await this._platoService.darDeBaja(item.id_carta);
      // await this._vibracion.confirmacion();
      // await this.mostrarAviso('Plato dado de baja correctamente.');
      // await this.cargarPlatos();
    } catch (error) {
      // await this.mostrarError();
    }
  }
}
