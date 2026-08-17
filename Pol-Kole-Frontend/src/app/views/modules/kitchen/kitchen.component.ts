import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../../services/room.service';
import { DialogService } from '../../../services/dialog.service';

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
  roomNumber?: string;
  items: KitchenOrderItem[];
  notes?: string;
  preparationStatus: string; // RECEIVED, PREPARING, READY, DELIVERED
  preparationTimer?: number;
  startTime?: string;
  endTime?: string;
  customerName?: string;
}

@Component({
  selector: 'app-kitchen',
  standalone: false,
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  servedOrders: KitchenOrder[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'active'; // active (RECEIVED, PREPARING) / served (READY, DELIVERED)

  private readonly baseUrl = 'http://localhost:8080/api/kitchen';

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  loadAll(): void {
    this.loadKitchenOrders();
    this.loadServedOrders();
  }

  loadKitchenOrders(): void {
    this.loading = true;
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.kitchenOrders = orders || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load kitchen queue.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadServedOrders(): void {
    this.loading = true;
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders/served`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.servedOrders = orders || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load served history.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateTicketStatus(id: number, status: string): void {
    this.dialogService.confirmAction('Update Ticket Status', `Mark Ticket #${id} status as ${status}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        this.http.put<ApiResponse<KitchenOrder>>(`${this.baseUrl}/orders/${id}/status?status=${status}`, {}).pipe(
          map(res => res.data)
        ).subscribe({
          next: () => {
            this.loadAll();
            this.dialogService.showSuccess('Status Updated', `Ticket #${id} status updated to ${status}.`);
          },
          error: () => {
            this.errorMessage = 'Failed to update ticket status.';
            this.loading = false;
            this.cdr.markForCheck();
            this.dialogService.showError('Update Failed', this.errorMessage);
          }
        });
      }
    });
  }

  get activeTickets(): KitchenOrder[] {
    if (this.activeTab === 'active') {
      return (this.kitchenOrders || []).filter(t => t.preparationStatus === 'RECEIVED' || t.preparationStatus === 'PREPARING');
    } else {
      return this.servedOrders || [];
    }
  }

  get receivedTickets(): KitchenOrder[] {
    return (this.kitchenOrders || [])
      .filter(t => t && t.preparationStatus === 'RECEIVED')
      .sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      });
  }

  get preparingTickets(): KitchenOrder[] {
    return (this.kitchenOrders || [])
      .filter(t => t && t.preparationStatus === 'PREPARING')
      .sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      });
  }
}
