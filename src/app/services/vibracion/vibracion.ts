import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

// Feedback háptico + sonoro centralizado, para que cualquier pantalla
// del equipo lo llame igual en vez de reimplementar Haptics.vibrate()
// y el audio suelto cada vez (como ya pasaba en Login).
// Requisitos excluyentes del TP: vibrar en TODOS los errores, y sonidos
// distintos según el evento.
@Injectable({ providedIn: 'root' })
export class Vibracion {
  async error(durationMs = 300): Promise<void> {
    await Haptics.vibrate({ duration: durationMs });
    this.reproducir('assets/sounds/spongebob-fail.mp3');
  }

  async confirmacion(durationMs = 100): Promise<void> {
    await Haptics.vibrate({ duration: durationMs });
    this.reproducir('assets/sounds/among-us.mp3');
  }

  private reproducir(ruta: string): void {
    const audio = new Audio(ruta);
    audio.load();
    audio.play().catch(error => {
      console.warn('El reproductor de audio requiere interacción previa del usuario:', error);
    });
  }
}
