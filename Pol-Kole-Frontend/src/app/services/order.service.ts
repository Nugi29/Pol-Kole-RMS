import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface OrderItemInput {
  menuItemId: number;
  quantity: number;
  price: number;
  notes?: string;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id?: number;
  customerId: number;
  customerName?: string;
  tableId: number;
  tableNumber?: string;
  statusId?: number;
  statusName?: string;
  totalAmount: number;
  items: OrderItem[];
  orderTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = 'http://localhost:8080/api/orders';

  constructor(private readonly http: HttpClient) {}

  createOrder(order: any): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(this.baseUrl, order).pipe(
      map(res => res.data)
    );
  }

  updateOrder(id: number, order: any): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`${this.baseUrl}/${id}`, order).pipe(
      map(res => res.data)
    );
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`${this.baseUrl}/${id}/status?status=${status}`, {}).pipe(
      map(res => res.data)
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  cancelOrder(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  filterOrders(statusId?: number, tableId?: number, customerId?: number, page: number = 0, size: number = 15): Observable<Page<Order>> {
    let params: any = { page: String(page), size: String(size) };
    if (statusId) params.statusId = String(statusId);
    if (tableId) params.tableId = String(tableId);
    if (customerId) params.customerId = String(customerId);

    return this.http.get<ApiResponse<Page<Order>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }
}
