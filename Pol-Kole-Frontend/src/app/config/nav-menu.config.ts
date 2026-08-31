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
    name: 'Live Displays',
    icon: 'tv',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'CHEF', 'DISPLAY'],
    children: [
      { name: 'Displays Hub', route: '/main/displays', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'CHEF', 'DISPLAY'] },
      { name: 'Takeaway Big Screen', route: '/display/takeaway', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'DISPLAY'] },
      { name: 'Table Displays', route: '/main/displays?tab=tables', roles: ['ADMIN', 'MANAGER', 'WAITER', 'DISPLAY'] },
      { name: 'Room Displays', route: '/main/displays?tab=rooms', roles: ['ADMIN', 'MANAGER', 'WAITER', 'DISPLAY'] },
    ],
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
      { name: 'Table Locations', route: '/main/tables?tab=locations', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Reservations',
    icon: 'event',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Book Table', route: '/main/reservations?tab=new', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Table Bookings', route: '/main/reservations?tab=list', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Book Room', route: '/main/reservations?tab=newRoom', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Room Bookings', route: '/main/reservations?tab=listRooms', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Front Desk Arrivals', route: '/main/check-in-out?tab=arrivals', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Room Stays checkout', route: '/main/check-in-out?tab=stays', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
    ],
  },
  {
    name: 'Menu Catalog',
    icon: 'restaurant_menu',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'],
    children: [
      { name: 'Menu Items', route: '/main/menu?tab=items', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'] },
      { name: 'Categories', route: '/main/menu?tab=categories', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
      { name: 'Item Discounts', route: '/main/menu?tab=discounts', roles: ['ADMIN', 'MANAGER'] },
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
    children: [
      { name: 'Active Chef Queue', route: '/main/kitchen?tab=active', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
      { name: 'Served Ledger', route: '/main/kitchen?tab=served', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
    ],
    roles: ['ADMIN', 'MANAGER', 'CHEF'],
  },
  {
    name: 'Waiter Service Hub',
    icon: 'restaurant',
    roles: ['ADMIN', 'MANAGER', 'WAITER'],
    children: [
      { name: 'Ready to Serve', route: '/main/waiter?tab=ready', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Guest & Room Calls', route: '/main/waiter?tab=requests', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Served History', route: '/main/waiter?tab=history', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
      { name: 'Cleaning Tasks', route: '/main/waiter?tab=cleaning', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
    ],
  },
  {
    name: 'Billing POS',
    icon: 'receipt',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    children: [
      { name: 'Invoices Ledger', route: '/main/billing?tab=invoices', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Payments Ledger', route: '/main/billing?tab=payments', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Discount Vouchers', route: '/main/billing?tab=vouchers', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Customers & Loyalty',
    icon: 'people',
    route: '/main/customers',
    roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'],
    children: [
      { name: 'Guests Directory', route: '/main/customers', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] },
    ],
  },
  {
    name: 'Staff & Users',
    icon: 'manage_accounts',
    roles: ['ADMIN', 'MANAGER'],
    children: [
      { name: 'Users', route: '/main/users', roles: ['ADMIN'] },
      { name: 'Attendance', route: '/main/attendance', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Assignments', route: '/main/staff-assignments', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Reports & MIS',
    icon: 'bar_chart',
    roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'],
    children: [
      { name: 'Daily Flash & Revenue', route: '/main/reports?tab=flash', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Menu Performance', route: '/main/reports?tab=menu', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Hotel Occupancy & Yield', route: '/main/reports?tab=hotel', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Kitchen Turnaround', route: '/main/reports?tab=kitchen', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Waiter & Staff Sales', route: '/main/reports?tab=staff', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Customer VIP & Loyalty', route: '/main/reports?tab=customer', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
      { name: 'Discounts & Audit', route: '/main/reports?tab=audit', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
    ],
  },
  {
    name: 'Audit Logging',
    icon: 'admin_panel_settings',
    route: '/main/audit-logs',
    roles: ['ADMIN'],
  },
  {
    name: 'Settings',
    icon: 'settings',
    route: '/main/settings',
    roles: ['ADMIN'],
  },
];

