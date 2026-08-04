import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ApiResponse } from '../../../services/room.service';
import { KitchenOrder } from '../kitchen/kitchen.component';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-waiter',
  standalone: false,
  templateUrl: './waiter.component.html',
  styleUrl: './waiter.component.css'
})
export class WaiterComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'ready'; // ready / history

  private readonly baseUrl = 'http://localhost:8080/api/kitchen';

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadOrders();
    });
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    
    // We determine status depending on the tab: READY for ready, DELIVERED for served history
    const status = this.activeTab === 'ready' ? 'READY' : 'DELIVERED';
    
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders/status?status=${status}`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.kitchenOrders = orders;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = `Failed to load ${status.toLowerCase()} orders.`;
        this.loading = false;
      }
    });
  }

  deliverOrder(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put<ApiResponse<KitchenOrder>>(`${this.baseUrl}/orders/${id}/status?status=DELIVERED`, {}).pipe(
      map(res => res.data)
    ).subscribe({
      next: () => {
        this.successMessage = `Order #${id} marked as delivered & served successfully.`;
        this.loadOrders();
      },
      error: () => {
        this.errorMessage = 'Failed to deliver order.';
        this.loading = false;
      }
    });
  }
}
