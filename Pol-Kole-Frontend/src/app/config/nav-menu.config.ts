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
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
  },
  {
    name: 'Orders',
    icon: 'shopping_cart',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Create Order', route: '/orders/create', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      {
        name: 'Active Orders',
        route: '/orders/active',
        roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
      },
      { name: 'Order History', route: '/orders/history', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Cancelled Orders', route: '/orders/cancelled', roles: ['ADMIN', 'MANAGER'] },
    ],
  },

  {
    name: 'Tables',
    icon: 'table_bar',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Table Layout', route: '/tables/layout', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Table List', route: '/tables/list', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Table Status', route: '/tables/status', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Add Table', route: '/tables/create', roles: ['ADMIN'] },
    ],
  },

  {
    name: 'Reservations',
    icon: 'event',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      {
        name: 'Create Reservation',
        route: '/reservations/create',
        roles: ['ADMIN', 'MANAGER', 'WAITER'],
      },
      {
        name: 'Reservation List',
        route: '/reservations/list',
        roles: ['ADMIN', 'MANAGER', 'WAITER'],
      },
      {
        name: "Today's Reservations",
        route: '/reservations/today',
        roles: ['ADMIN', 'MANAGER', 'WAITER'],
      },
      {
        name: 'Reservation Calendar',
        route: '/reservations/calendar',
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        name: 'Cancelled Reservations',
        route: '/reservations/cancelled',
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },

  {
    name: 'Menu',
    icon: 'restaurant_menu',
    roles: ['ADMIN', 'MANAGER'],
    children: [
      { name: 'Menu Categories', route: '/menu/categories', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Menu Items', route: '/menu/items', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Add Menu Item', route: '/menu/items/create', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Menu Availability', route: '/menu/availability', roles: ['ADMIN', 'MANAGER'] },
    ],
  },

  {
    name: 'Kitchen',
    icon: 'kitchen',
    roles: ['ADMIN', 'MANAGER', 'CHEF'],
    children: [
      {
        name: 'Kitchen Dashboard',
        route: '/kitchen/dashboard',
        roles: ['ADMIN', 'MANAGER', 'CHEF'],
      },
      {
        name: 'Active Kitchen Tickets',
        route: '/kitchen/tickets/active',
        roles: ['ADMIN', 'MANAGER', 'CHEF'],
      },
      {
        name: 'Ready Orders',
        route: '/kitchen/tickets/ready',
        roles: ['ADMIN', 'MANAGER', 'CHEF'],
      },
      {
        name: 'Completed Tickets',
        route: '/kitchen/tickets/completed',
        roles: ['ADMIN', 'MANAGER', 'CHEF'],
      },
    ],
  },

  {
    name: 'Billing',
    icon: 'receipt',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    children: [
      { name: 'Generate Bill', route: '/billing/generate', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Active Bills', route: '/billing/active', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Payment History', route: '/billing/history', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Refunds', route: '/billing/refunds', roles: ['ADMIN'] },
    ],
  },

  {
    name: 'Customers',
    icon: 'people',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
    children: [
      { name: 'Customer List', route: '/customers/list', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Add Customer', route: '/customers/create', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Customer Orders', route: '/customers/orders', roles: ['ADMIN', 'MANAGER'] },
    ],
  },

  {
    name: 'Users',
    icon: 'admin_panel_settings',
    route: '/main/users',
    roles: ['ADMIN'],
  },

  {
    name: 'Reports',
    icon: 'bar_chart',
    roles: ['ADMIN', 'MANAGER'],
    children: [
      { name: 'Daily Sales', route: '/reports/daily-sales', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Monthly Sales', route: '/reports/monthly-sales', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Popular Menu Items', route: '/reports/popular-items', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Order Reports', route: '/reports/orders', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Payment Reports', route: '/reports/payments', roles: ['ADMIN', 'MANAGER'] },
    ],
  },

  // {
  //   name: 'Statuses',
  //   icon: 'sync_alt',
  //   roles: ['ADMIN'],
  //   children: [
  //     { name: 'Order Status', route: '/statuses/order-status', roles: ['ADMIN'] },
  //     { name: 'Order Item Status', route: '/statuses/order-item-status', roles: ['ADMIN'] },
  //     { name: 'Kitchen Ticket Status', route: '/statuses/kitchen-ticket-status', roles: ['ADMIN'] },
  //     { name: 'Reservation Status', route: '/statuses/reservation-status', roles: ['ADMIN'] },
  //     { name: 'Table Status', route: '/statuses/table-status', roles: ['ADMIN'] },
  //   ],
  // },

  {
    name: 'Settings',
    icon: 'settings',
    roles: ['ADMIN', 'MANAGER'],
    children: [
      {
        name: 'Restaurant Information',
        route: '/settings/restaurant',
        roles: ['ADMIN', 'MANAGER'],
      },
      { name: 'Tax Settings', route: '/settings/tax', roles: ['ADMIN'] },
      { name: 'Payment Methods', route: '/settings/payments', roles: ['ADMIN'] },
      { name: 'System Preferences', route: '/settings/system', roles: ['ADMIN'] },
    ],
  },
];

