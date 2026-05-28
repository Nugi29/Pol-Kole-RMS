export interface NavMenuChild {
  name: string;
  route: string;
  roles: string[];
}

export interface NavMenuItem {
  name: string;
  icon: string;
  route?: string;
  roles: string[];
  children?: NavMenuChild[];
}

export const NAV_MENU = [
  {
    name: 'Dashboard',
    icon: 'dashboard',
    route: '/main/dashboard',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'CHEF'],
  },
  {
    name: 'Rooms Hub',
    icon: 'meeting_room',
    roles: ['ADMIN', 'MANAGER'],
    children: [
      { name: 'Rooms List', route: '/main/rooms?tab=directory', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Categories', route: '/main/rooms?tab=types', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Tables Floor',
    icon: 'table_bar',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Floor Grid', route: '/main/tables?tab=grid', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Live Occupancy', route: '/main/tables?tab=occupancy', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Reservations',
    icon: 'event',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Book Table', route: '/main/reservations?tab=new', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Bookings List', route: '/main/reservations?tab=list', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
    ],
  },
  {
    name: 'Menu Catalog',
    icon: 'restaurant_menu',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'],
    children: [
      { name: 'Menu Items', route: '/main/menu?tab=items', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'] },
      { name: 'Categories', route: '/main/menu?tab=categories', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
    ],
  },
  {
    name: 'Orders Console',
    icon: 'shopping_cart',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
    children: [
      { name: 'POS Order Builder', route: '/main/orders?tab=pos', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Active Orders Deck', route: '/main/orders?tab=list', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
    ],
  },
  {
    name: 'Chef Kitchen Hub',
    icon: 'kitchen',
    route: '/main/kitchen',
    roles: ['ADMIN', 'MANAGER', 'CHEF'],
  },
  {
    name: 'Billing POS',
    icon: 'receipt',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    children: [
      { name: 'Cashier Settle', route: '/main/billing?tab=settle', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Invoices Ledger', route: '/main/billing?tab=invoices', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Payments Ledger', route: '/main/billing?tab=payments', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    ],
  },
  {
    name: 'Inventory Stock',
    icon: 'inventory',
    roles: ['ADMIN', 'MANAGER', 'CHEF'],
    children: [
      { name: 'Stock Levels', route: '/main/inventory?tab=stock', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
      { name: 'Transactions Log', route: '/main/inventory?tab=transactions', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Customers & Loyalty',
    icon: 'people',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
    children: [
      { name: 'Guests Directory', route: '/main/customers', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
    ],
  },
  {
    name: 'Audit Logging',
    icon: 'admin_panel_settings',
    route: '/main/audit-logs',
    roles: ['ADMIN'],
  },
];

