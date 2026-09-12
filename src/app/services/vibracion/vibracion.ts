import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

// Feedback háptico centralizado, para que cualquier pantalla del equipo
// lo llame igual en vez de reimplementar Haptics.vibrate() con
// duraciones sueltas cada vez (como ya pasaba en Login).
// Requisito excluyente del TP: vibrar en TODOS los errores.
@Injectable({ providedIn: 'root' })
export class Vibracion {
  async error(durationMs = 300): Promise<void> {
    await Haptics.vibrate({ duration: durationMs });
  }

  async confirmacion(durationMs = 100): Promise<void> {
    await Haptics.vibrate({ duration: durationMs });
  }
}
