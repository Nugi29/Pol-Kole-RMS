import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './views/login/login.component';
import { MainwindowComponent } from './views/mainwindow/mainwindow.component';
import { HomeComponent } from './views/home/home.component';
import { UserComponent } from './views/modules/user/user.component';
import { RoomComponent } from './views/modules/room/room.component';
import { ReservationComponent } from './views/modules/reservation/reservation.component';
import { CheckInOutComponent } from './views/modules/check-in-out/check-in-out.component';
import { BillingComponent } from './views/modules/billing/billing.component';
import { CustomerComponent } from './views/modules/customer/customer.component';
import { AuditLogsComponent } from './views/modules/audit-logs/audit-logs.component';
import { TablesComponent } from './views/modules/tables/tables.component';
import { MenuComponent } from './views/modules/menu/menu.component';
import { OrdersComponent } from './views/modules/orders/orders.component';
import { KitchenComponent } from './views/modules/kitchen/kitchen.component';
import { InventoryComponent } from './views/modules/inventory/inventory.component';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'main',
    component: MainwindowComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        component: HomeComponent,
      },
      {
        path: 'rooms',
        component: RoomComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER'] }
      },
      {
        path: 'tables',
        component: TablesComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'WAITER'] }
      },
      {
        path: 'reservations',
        component: ReservationComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAITER'] }
      },
      {
        path: 'check-in-out',
        component: CheckInOutComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAITER', 'CASHIER', 'CHEF'] }
      },
      {
        path: 'billing',
        component: BillingComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER'] }
      },
      {
        path: 'customers',
        component: CustomerComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAITER', 'CASHIER'] }
      },
      {
        path: 'menu',
        component: MenuComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'] }
      },
      {
        path: 'orders',
        component: OrdersComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] }
      },
      {
        path: 'kitchen',
        component: KitchenComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'CHEF'] }
      },
      {
        path: 'inventory',
        component: InventoryComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'MANAGER', 'CHEF'] }
      },
      {
        path: 'audit-logs',
        component: AuditLogsComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'users',
        component: UserComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'users/roles',
        component: UserComponent,
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
