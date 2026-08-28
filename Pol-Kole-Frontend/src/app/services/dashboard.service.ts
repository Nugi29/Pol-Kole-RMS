import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';

export interface RecentOrderSummary {
  id: number;
  orderNumber: string;
  orderTime: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'ROOM_SERVICE' | string;
  locationInfo: string;
  customerName: string;
  totalAmount: number;
  status: string;
  itemCount: number;
}

export interface DashboardReservation {
  id: number;
  reservationType: 'TABLE' | 'ROOM' | string;
  customerName: string;
  customerContact: string;
  targetNumber: string;
  reservationTimeOrDate: string;
  guestsCount: number;
  status: string;
}

export interface TopSellingItem {
  itemId: number;
  itemName: string;
  categoryName: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface LowStockAlert {
  itemId: number;
  itemName: string;
  unit: string;
  currentStock: number;
  minimumStockLevel: number;
  status: 'OUT_OF_STOCK' | 'CRITICAL_LOW' | string;
}

export interface KitchenTicketSummary {
  ticketId: number;
  orderId: number;
  station: string;
  preparationStatus: string;
  preparationTimer?: number;
  startTime: string;
  locationInfo: string;
  itemsCount: number;
}

export interface DashboardStats {
  // Tables
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  cleaningTables: number;
  tableOccupancyRate: number;

  // Rooms
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  roomOccupancyRate: number;

  // Reservations & Arrivals
  activeTableReservationsToday: number;
  activeHotelReservationsToday: number;
  checkInsToday: number;
  checkOutsToday: number;
  activeRoomStaysToday: number;

  // Orders & Financials
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  averageOrderValue: number;
  paidInvoicesToday: number;
  unpaidInvoicesToday: number;
  unpaidInvoicesTotalAmount: number;

  // Operations
  pendingKitchenOrders: number;
  readyKitchenOrders: number;
  lowStockInventoryAlerts: number;
  staffOnDutyToday: number;
  totalStaffCount: number;

  // Distribution
  dineInOrdersCount: number;
  takeawayOrdersCount: number;
  roomServiceOrdersCount: number;

  // Maps
  monthlyRevenue: Record<string, number>;
  weeklyRevenue: Record<string, number>;
  revenueByChannel: Record<string, number>;
  orderStatusDistribution: Record<string, number>;

  // Collections
  recentOrders?: RecentOrderSummary[];
  todaysReservations?: DashboardReservation[];
  topSellingItems?: TopSellingItem[];
  lowStockItems?: LowStockAlert[];
  activeKitchenTickets?: KitchenTicketSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly baseUrl = 'http://localhost:8080/api/dashboard';

  constructor(private readonly http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.baseUrl}/stats`).pipe(
      map(res => res.data)
    );
  }
}

