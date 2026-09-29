import { AdminModule } from '@app/models/admin.model';
import { EPerfilUsuario } from '../../../enums/role.enum';

export const ADMIN_MODULES: AdminModule[] = [
  {
    id: 'empleados',
    title: 'Empleados',
    description: 'Gestionar empleados del restaurante',
    icon: 'cap',
    roles: [EPerfilUsuario.Dueno, EPerfilUsuario.Supervisor],
    path: 'employees',
  },

  {
    id: 'platos',
    title: 'Platos',
    description: 'Gestionar los platos del menú',
    icon: 'spoon-and-fork',
    roles: [EPerfilUsuario.Cocinero],
    path: 'dishes',
  },

  {
    id: 'postres',
    title: 'Postres',
    description: 'Gestionar los postres del menú',
    icon: 'pudding',
    roles: [EPerfilUsuario.Cocinero],
    path: 'postres',
  },

  {
    id: 'bebidas',
    title: 'Bebidas',
    description: 'Gestionar las bebidas del menú',
    icon: 'bottle-and-glass',
    roles: [EPerfilUsuario.Cantinero],
    path: 'drinks',
  },

  {
    id: 'mesas',
    title: 'Mesas',
    description: 'Gestionar las mesas del restaurante',
    icon: 'table',
    roles: [EPerfilUsuario.Dueno, EPerfilUsuario.Supervisor],
    path: 'tables',
  },

  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Gestionar clientes registrados',
    icon: 'profile-2-user',
    roles: [EPerfilUsuario.Dueno, EPerfilUsuario.Supervisor],
    path: 'clients',
  },

  {
    id: 'lista-espera',
    title: 'Lista de espera',
    description: 'Consultar clientes esperando una mesa',
    icon: 'clock',
    roles: [EPerfilUsuario.Metre],
    path: 'waitlist',
  },

  {
    id: 'asignacion-mesas',
    title: 'Asignación de mesas',
    description: 'Asignar mesas a los clientes',
    icon: 'table',
    roles: [EPerfilUsuario.Metre],
    path: 'table-assignment',
  },

  {
    id: 'consultas',
    title: 'Consultas',
    description: 'Responder consultas de los clientes',
    icon: 'messages',
    roles: [EPerfilUsuario.Mozo],
    path: 'queries',
  },

  {
    id: 'pedidos',
    title: 'Pedidos',
    description: 'Gestionar pedidos de los clientes',
    icon: 'receipt-edit',
    roles: [EPerfilUsuario.Mozo],
    path: 'orders',
  },

  {
    id: 'cocina',
    title: 'Cocina',
    description: 'Consultar y preparar pedidos',
    icon: 'oven-2',
    roles: [EPerfilUsuario.Cocinero],
    path: 'kitchen',
  },

  {
    id: 'bar',
    title: 'Bar',
    description: 'Consultar y preparar bebidas',
    icon: 'bar',
    roles: [EPerfilUsuario.Cantinero],
    path: 'bar',
  },

  {
    id: 'pedidos-listos',
    title: 'Pedidos listos',
    description: 'Consultar pedidos preparados',
    icon: 'shopping-cart',
    roles: [EPerfilUsuario.Mozo],
    path: 'ready-orders',
  },

  {
    id: 'entrega-pedidos',
    title: 'Entrega de pedidos',
    description: 'Gestionar la entrega de pedidos',
    icon: 'bag',
    roles: [EPerfilUsuario.Mozo],
    path: 'order-delivery',
  },

  {
    id: 'pagos',
    title: 'Pagos',
    description: 'Gestionar pagos de los clientes',
    icon: 'card',
    roles: [EPerfilUsuario.Mozo],
    path: 'payments',
  },
];
