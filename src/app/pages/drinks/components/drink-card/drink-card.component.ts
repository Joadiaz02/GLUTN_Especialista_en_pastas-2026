import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

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

  tagText = input<string>();
  sizeText = input<string>();
  tagColor = input<string>();
  isFavorite = input<boolean>(false);

  favoriteClick = output<void>();
  editClick = output<void>();
  deleteClick = output<void>();

  // private _confirm = inject(Confirm);

  onFavorite() {
    this.favoriteClick.emit();
  }

  onEdit() {
    this.editClick.emit();
  }

  async onDelete() {
    // const confirmado = await this._confirm.preguntar({
    //   titulo: '¿Dar de baja el plato?',
    //   mensaje: `"${this.name()}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
    //   textoConfirmar: 'Dar de baja',
    //   colorConfirmar: 'danger',
    //   icono: 'trash-outline',
    // });

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
