export interface CuentaCliente {
  estado: 'cuenta_entregada' | 'pago_realizado';
  idMesa: string;
  idsPedidos: string[];
  propinaPorcentaje: number;
  lineas: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
  }[];
}