import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class Vibracion {

  // la vibración es solo para errores
  async error(durationMs = 300): Promise<void> {
    await this.vibrar(durationMs);
  }

  async errorValidacion(
    durationMs = 200
  ): Promise<void> {
    await this.vibrar(durationMs);
  }

  // push recibida con la app abierta
  async aviso(): Promise<void> {
    this.reproducir(
      'assets/sounds/aviso.wav'
    );

    await this.vibrar(400);
  }


  sonidoInicio(): void {
    this.reproducir(
      'assets/sounds/inicio.mp3'
    );
  }

  sonidoCierre(): void {
    this.reproducir(
      'assets/sounds/cierre.mp3'
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