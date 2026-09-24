export type TipoCarta = 'plato' | 'bebida' | 'postre';

export interface CartaItem {
  id_carta: string;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: TipoCarta;
  foto_1: string;
  foto_2: string;
  foto_3: string;
  tiempo_elaboracion: number;
  sugerencia: boolean;
  destacado: boolean;
  medida_ml: number | null;
  tiene_alcohol: boolean | null;
  baja_logica: boolean;
  fecha_emision_carta: string;
}
