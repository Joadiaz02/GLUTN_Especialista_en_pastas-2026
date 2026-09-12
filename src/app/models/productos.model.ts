export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tiempoElaboracion: number;
  tipo: 'comida' | 'bebida' | 'postre';
  fotos: string[];
} 