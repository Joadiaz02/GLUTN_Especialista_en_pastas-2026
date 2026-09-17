import { Component, OnInit } from '@angular/core';

import { Producto } from '@app/models/productos.model';

@Component({
  selector: 'app-carta',
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [
    
  ],
})
export class CartaPage implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }


  productos: Producto[] = [
    {
      id: 1,
      nombre: 'Ravioles de ricota',
      descripcion: 'Pasta rellena casera con salsa a elección',
      precio: 8500,
      tiempoElaboracion: 20,
      tipo: 'comida',
      fotos: [
        'assets/images/productos/ravioles-1.jpg',
        'assets/images/productos/ravioles-2.jpg',
        'assets/images/productos/ravioles-3.jpg'
      ]
    },
    {
      id: 2,
      nombre: 'Fideos con salsa bolognesa',
      descripcion: 'Fideos frescos con salsa de carne casera',
      precio: 7900,
      tiempoElaboracion: 15,
      tipo: 'comida',
      fotos: [
        'assets/images/productos/fideos-1.jpg',
        'assets/images/productos/fideos-2.jpg',
        'assets/images/productos/fideos-3.jpg'
      ]
    },
    {
      id: 3,
      nombre: 'Limonada',
      descripcion: 'Limonada casera con menta',
      precio: 2500,
      tiempoElaboracion: 5,
      tipo: 'bebida',
      fotos: [
        'assets/images/productos/limonada-1.jpg',
        'assets/images/productos/limonada-2.jpg',
        'assets/images/productos/limonada-3.jpg'
      ]
    }
  ];
}
