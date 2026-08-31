import { NgModule, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppRoutingModule } from './app-routing-module';
import { AppComponent } from './app.component';
import { LoginComponent } from './views/login/login.component';
import { MainwindowComponent } from './views/mainwindow/mainwindow.component';
import Aura from '@primeuix/themes/aura';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { providePrimeNG } from 'primeng/config';
import { HomeComponent } from './views/home/home.component';
import { UserComponent } from './views/modules/user/user.component';
import { ConfirmComponent } from './shared/dialog/confirm/confirm.component';
import { MessageComponent } from './shared/dialog/message/message.component';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';
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
import { WaiterComponent } from './views/modules/waiter/waiter.component';
import { AttendanceComponent } from './views/modules/attendance/attendance.component';
import { StaffAssignmentComponent } from './views/modules/staff-assignment/staff-assignment.component';
import { TakeawayDisplayComponent } from './views/modules/display/takeaway-display/takeaway-display.component';
import { GuestDisplayComponent } from './views/modules/display/guest-display/guest-display.component';
import { DisplayHubComponent } from './views/modules/display/display-hub/display-hub.component';
import { NotificationBellComponent } from './shared/notification-bell/notification-bell.component';
import { SettingsComponent } from './views/modules/settings/settings.component';
import { SettingsService } from './services/settings.service';

export function initializeRestaurantSettings(settingsService: SettingsService) {
  return () => settingsService.loadSettings(true);
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainwindowComponent,
    HomeComponent,
    UserComponent,
    RoomComponent,
    ReservationComponent,
    CheckInOutComponent,
    BillingComponent,
    CustomerComponent,
    AuditLogsComponent,
    TablesComponent,
    MenuComponent,
    OrdersComponent,
    KitchenComponent,
    WaiterComponent,
    AttendanceComponent,
    StaffAssignmentComponent,
    TakeawayDisplayComponent,
    GuestDisplayComponent,
    DisplayHubComponent,
    NotificationBellComponent,
    SettingsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatGridListModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ConfirmComponent,
    MessageComponent,
    ButtonLabel,
    ButtonDirective,
    InputText,
    IconField,
    InputIcon,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRestaurantSettings,
      deps: [SettingsService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
