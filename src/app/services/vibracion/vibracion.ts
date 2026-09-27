import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class Vibracion {

  async error(durationMs = 300): Promise<void> {
    await this.vibrar(durationMs);

    this.reproducir(
      'assets/sounds/spongebob-fail.mp3'
    );
  }

  async errorValidacion(
    durationMs = 200
  ): Promise<void> {
    await this.vibrar(durationMs);
  }

  async confirmacion(
    durationMs = 100
  ): Promise<void> {
    await this.vibrar(durationMs);

    this.reproducir(
      'assets/sounds/among-us.mp3'
    );
  }


  sonidoInicio(): void {
    this.reproducir(
      'assets/sounds/inicio.mp3'
    );
  }

  sonidoCierre(): void {
    this.reproducir(
      'assets/sounds/cierre.wav'
    );
  }


  private async vibrar(
    durationMs: number
  ): Promise<void> {
    try {
      await Haptics.vibrate({
        duration: durationMs,
      });
    } catch (error) {
      console.warn(
        'No se pudo ejecutar la vibración:',
        error
      );
    }
  }


  private reproducir(
    ruta: string
  ): void {
    try {
      const audio = new Audio(ruta);

      audio.preload = 'auto';

      void audio.play().catch((error) => {
        console.warn(
          'No se pudo reproducir el sonido:',
          error
        );
      });
    } catch (error) {
      console.warn(
        'No se pudo crear el reproductor de audio:',
        error
      );
    }
  }
}