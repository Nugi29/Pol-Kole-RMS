import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../../services/room.service';

export interface KitchenOrderItem {
  id?: number;
  menuItemName: string;
  quantity: number;
  notes?: string;
}

export interface KitchenOrder {
  id?: number;
  orderId: number;
  tableNumber: string;
  items: KitchenOrderItem[];
  notes?: string;
  preparationStatus: string; // RECEIVED, PREPARING, READY, DELIVERED
  preparationTimer?: number;
}

@Component({
  selector: 'app-kitchen',
  standalone: false,
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'active'; // active (RECEIVED, PREPARING) / served (READY, DELIVERED)

  private readonly baseUrl = 'http://localhost:8080/api/kitchen';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadKitchenOrders();
  }

  loadKitchenOrders(): void {
    this.loading = true;
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.kitchenOrders = orders;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load kitchen queue.';
        this.loading = false;
      }
    });
  }

  updateTicketStatus(id: number, status: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put<ApiResponse<KitchenOrder>>(`${this.baseUrl}/orders/${id}/status?status=${status}`, {}).pipe(
      map(res => res.data)
    ).subscribe({
      next: () => {
        this.successMessage = `Ticket #${id} status updated to ${status}.`;
        this.loadKitchenOrders();
      },
      error: () => {
        this.errorMessage = 'Failed to update ticket status.';
        this.loading = false;
      }
    });
  }

  get activeTickets(): KitchenOrder[] {
    if (this.activeTab === 'active') {
      return this.kitchenOrders.filter(t => t.preparationStatus === 'RECEIVED' || t.preparationStatus === 'PREPARING');
    } else {
      return this.kitchenOrders.filter(t => t.preparationStatus === 'READY' || t.preparationStatus === 'DELIVERED');
    }
  }
}
