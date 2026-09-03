import { AdminModule } from "@app/models/admin.model";
import { EPerfilUsuario } from '../../../enums/role.enum';

export const ADMIN_MODULES: AdminModule[] = [

  {
    id: 'empleados',
    title: 'Empleados',
    description: 'Gestionar empleados del restaurante',
    icon: 'people-outline',
    roles: [
      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor
    ]
  },

  {
    id: 'platos',
    title: 'Platos',
    description: 'Gestionar los platos del menú',
    icon: 'restaurant-outline',
    roles: [
      EPerfilUsuario.Cocinero
    ]
  },

  {
    id: 'bebidas',
    title: 'Bebidas',
    description: 'Gestionar las bebidas del menú',
    icon: 'wine-outline',
    roles: [
      EPerfilUsuario.Cantinero
    ]
  },

  {
    id: 'mesas',
    title: 'Mesas',
    description: 'Gestionar las mesas del restaurante',
    icon: 'grid-outline',
    roles: [
      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor
    ]
  },

  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Gestionar clientes registrados',
    icon: 'person-outline',
    roles: [
      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor
    ]
  },

  {
    id: 'lista-espera',
    title: 'Lista de espera',
    description: 'Consultar clientes esperando una mesa',
    icon: 'time-outline',
    roles: [
      EPerfilUsuario.Metre
    ]
  },

  {
    id: 'asignacion-mesas',
    title: 'Asignación de mesas',
    description: 'Asignar mesas a los clientes',
    icon: 'restaurant-outline',
    roles: [
      EPerfilUsuario.Metre
    ]
  },

  {
    id: 'consultas',
    title: 'Consultas',
    description: 'Responder consultas de los clientes',
    icon: 'chatbubble-ellipses-outline',
    roles: [
      EPerfilUsuario.Mozo
    ]
  },

  {
    id: 'pedidos',
    title: 'Pedidos',
    description: 'Gestionar pedidos de los clientes',
    icon: 'receipt-outline',
    roles: [
      EPerfilUsuario.Mozo
    ]
  },

  {
    id: 'cocina',
    title: 'Cocina',
    description: 'Consultar y preparar pedidos',
    icon: 'restaurant-outline',
    roles: [
      EPerfilUsuario.Cocinero
    ]
  },

  {
    id: 'bar',
    title: 'Bar',
    description: 'Consultar y preparar bebidas',
    icon: 'wine-outline',
    roles: [
      EPerfilUsuario.Cantinero
    ]
  },

  {
    id: 'pedidos-listos',
    title: 'Pedidos listos',
    description: 'Consultar pedidos preparados',
    icon: 'checkmark-circle-outline',
    roles: [
      EPerfilUsuario.Mozo
    ]
  },

  {
    id: 'entrega-pedidos',
    title: 'Entrega de pedidos',
    description: 'Gestionar la entrega de pedidos',
    icon: 'bag-check-outline',
    roles: [
      EPerfilUsuario.Mozo
    ]
  },

  {
    id: 'pagos',
    title: 'Pagos',
    description: 'Gestionar pagos de los clientes',
    icon: 'card-outline',
    roles: [
      EPerfilUsuario.Mozo
    ]
  }

];