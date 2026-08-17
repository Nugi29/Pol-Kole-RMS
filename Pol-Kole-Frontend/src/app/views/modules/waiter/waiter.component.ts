import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ApiResponse, RoomService, Room } from '../../../services/room.service';
import { TableService, RestaurantTable } from '../../../services/table.service';
import { KitchenOrder } from '../kitchen/kitchen.component';
import { map, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-waiter',
  standalone: false,
  templateUrl: './waiter.component.html',
  styleUrl: './waiter.component.css'
})
export class WaiterComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  cleaningRooms: Room[] = [];
  cleaningTables: RestaurantTable[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'ready'; // ready / history

  private readonly baseUrl = 'http://localhost:8080/api/kitchen';

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly roomService: RoomService,
    private readonly tableService: TableService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.syncBoard();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.syncBoard();
      this.cdr.markForCheck();
    });
  }

  syncBoard(): void {
    if (this.activeTab === 'cleaning') {
      this.loadCleaningTasks();
    } else {
      this.loadOrders();
    }
  }

  loadCleaningTasks(): void {
    this.loading = true;
    this.errorMessage = '';
    
    forkJoin({
      rooms: this.roomService.filterRooms('CLEANING', undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      ),
      tables: this.tableService.filterTables('CLEANING', undefined, undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      )
    }).subscribe({
      next: (res) => {
        this.cleaningRooms = res.rooms?.content || [];
        this.cleaningTables = res.tables?.content || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load cleaning tasks', err);
        this.errorMessage = 'Failed to load cleaning tasks.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cleanRoom(room: Room): void {
    if (!room.id) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updatedRoom: Room = {
      ...room,
      status: 'AVAILABLE'
    };

    this.roomService.updateRoom(room.id, updatedRoom).subscribe({
      next: () => {
        this.successMessage = `Room ${room.roomNumber} has been cleaned and is now available.`;
        this.loadCleaningTasks();
      },
      error: () => {
        this.errorMessage = `Failed to update Room ${room.roomNumber}.`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cleanTable(table: RestaurantTable): void {
    if (!table.id) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updatedTable: RestaurantTable = {
      ...table,
      status: 'AVAILABLE'
    };

    this.tableService.updateTable(table.id, updatedTable).subscribe({
      next: () => {
        this.successMessage = `Table ${table.tableNumber} is now clean and available.`;
        this.loadCleaningTasks();
      },
      error: () => {
        this.errorMessage = `Failed to update Table ${table.tableNumber}.`;
        this.loading = false;
        this.cdr.markForCheck();
      }
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
        const orderList = orders || [];
        if (this.activeTab === 'ready') {
          orderList.sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (a.id || 0) - (b.id || 0);
          });
        }
        this.kitchenOrders = orderList;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = `Failed to load ${status.toLowerCase()} orders.`;
        this.loading = false;
        this.cdr.markForCheck();
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
