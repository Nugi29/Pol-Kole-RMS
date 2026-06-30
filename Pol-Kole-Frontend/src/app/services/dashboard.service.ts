import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';

export interface DashboardStats {
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  cleaningTables: number;
  activeReservationsToday: number;
  ordersToday: number;
  revenueToday: number;
  pendingKitchenOrders: number;
  lowStockInventoryAlerts: number;
  monthlyRevenue: Record<string, number>;
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
