import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { WebsocketService } from '../../../../services/websocket.service';
import { Order, OrderService } from '../../../../services/order.service';
import { KitchenOrder } from '../../kitchen/kitchen.component';
import { TableService, RestaurantTable } from '../../../../services/table.service';
import { RoomService, Room } from '../../../../services/room.service';
import { Reservation, ReservationService } from '../../../../services/reservation.service';

export interface DisplayOrderRound {
  order: Order;
  roundNumber: number;
  kitchenStatus: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';
}

@Component({
  selector: 'app-guest-display',
  standalone: false,
  templateUrl: './guest-display.component.html',
  styleUrls: ['./guest-display.component.css']
})
export class GuestDisplayComponent implements OnInit, OnDestroy {
  locationType: 'TABLE' | 'ROOM' = 'TABLE';
  locationId: number | null = null;
  locationLabel = '';
  locationDetail: RestaurantTable | Room | null = null;
  activeReservation: Reservation | null = null;

  currentTime = new Date();
  activeOrders: DisplayOrderRound[] = [];
  selectedOrderTab = 0; // 0 for All, or order index + 1
  isFullscreen = false;

  // Interactive feedback
  callState: { active: boolean; type: string; message: string; timestamp: Date | null } = {
    active: false,
    type: '',
    message: '',
    timestamp: null
  };

  // WiFi & resort info
  wifiName = 'POL_KOLE_GUEST_5G';
  wifiPass = 'PolKole2026';
  copiedWifi = false;

  private clockSub: Subscription | null = null;
  private routeSub: Subscription | null = null;
  private ordersSub: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly wsService: WebsocketService,
    private readonly orderService: OrderService,
    private readonly tableService: TableService,
    private readonly roomService: RoomService,
    private readonly reservationService: ReservationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 1. Clock interval
    this.clockSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    });

    // 2. Detect route params (table/:tableId or room/:roomId)
    this.routeSub = this.route.params.subscribe(params => {
      if (params['tableId']) {
        this.locationType = 'TABLE';
        this.locationId = Number(params['tableId']);
        this.loadTableInfo(this.locationId);
      } else if (params['roomId']) {
        this.locationType = 'ROOM';
        this.locationId = Number(params['roomId']);
        this.loadRoomInfo(this.locationId);
      }
      this.listenToOrders();
    });
  }

  ngOnDestroy(): void {
    if (this.clockSub) this.clockSub.unsubscribe();
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.ordersSub) this.ordersSub.unsubscribe();
  }

  private loadTableInfo(id: number): void {
    this.tableService.getTableById(id).subscribe({
      next: (t: RestaurantTable) => {
        this.locationDetail = t;
        this.locationLabel = `Table ${t.tableNumber || id}`;
        this.loadTableReservation(id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.locationLabel = `Table #${id}`;
        this.cdr.markForCheck();
      }
    });
  }

  private loadTableReservation(tableId: number): void {
    this.reservationService.filterReservations(undefined, tableId, undefined, undefined, undefined, 0, 10).subscribe({
      next: (page) => {
        const reservations = page?.content || [];
        this.activeReservation = reservations.find(r => (r.reservationStatusName || '').toUpperCase() !== 'CANCELLED') || null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeReservation = null;
      }
    });
  }

  arriveAndSeatGuest(): void {
    if (this.locationType === 'TABLE' && this.locationId) {
      this.tableService.updateTableStatus(this.locationId, 'OCCUPIED').subscribe({
        next: () => {
          if (this.locationDetail) {
            this.locationDetail.status = 'OCCUPIED';
          }
          this.wsService.sendMessage('TABLE_UPDATED', { tableId: this.locationId, status: 'OCCUPIED' });
          this.wsService.callWaiter('TABLE', this.locationLabel, 'WAITER', `Reserved guest (${this.activeReservation?.customerName || 'VIP Guest'}) has arrived and is seated!`);
          this.showCallFeedback('WAITER', 'Welcome! Your waiter has been notified of your arrival.');
          this.cdr.markForCheck();
        },
        error: () => {
          this.showCallFeedback('WAITER', 'Welcome! Please notify your waiter to begin service.');
        }
      });
    }
  }

  private loadRoomInfo(id: number): void {
    this.roomService.getRoomById(id).subscribe({
      next: (r: Room) => {
        this.locationDetail = r;
        this.locationLabel = `Room ${r.roomNumber || id}`;
        this.cdr.markForCheck();
      },
      error: () => {
        this.locationLabel = `Room #${id}`;
        this.cdr.markForCheck();
      }
    });
  }

  private listenToOrders(): void {
    if (this.ordersSub) this.ordersSub.unsubscribe();

    this.ordersSub = this.wsService.allOrders$.subscribe(orders => {
      const kitchenTickets = this.wsService.kitchenOrders$.value || [];
      this.findActiveOrder(orders, kitchenTickets);
    });

    this.wsService.refreshAllData();
  }

  private findActiveOrder(orders: Order[], kitchenTickets: KitchenOrder[]): void {
    if (!orders || !this.locationId) {
      this.activeOrders = [];
      this.cdr.markForCheck();
      return;
    }

    // Filter by tableId or roomId
    const matching = orders.filter(o => {
      if (this.locationType === 'TABLE') {
        return o.tableId === this.locationId;
      } else {
        return o.roomId === this.locationId;
      }
    });

    // Filter non-cancelled and non-paid orders (can be 1 or multiple rounds)
    const activeList = matching
      .filter(o => {
        const s = (o.statusName || '').toUpperCase();
        return !s.includes('CANCEL') && !s.includes('PAID');
      })
      .sort((a, b) => (a.id || 0) - (b.id || 0)); // Ascending by order round

    const rounds: DisplayOrderRound[] = activeList.map((ord, idx) => {
      // Deterministically sort items to prevent UI shuffling / jumping on real-time re-renders
      if (ord.items && ord.items.length > 0) {
        ord.items = [...ord.items].sort((a, b) => {
          const idA = a.id ?? a.menuItemId ?? 0;
          const idB = b.id ?? b.menuItemId ?? 0;
          if (idA !== idB) return idA - idB;
          return (a.menuItemName || '').localeCompare(b.menuItemName || '');
        });
      }

      let kStatus: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' = 'RECEIVED';
      const kTicket = kitchenTickets.find(kt => kt.orderId === ord.id);
      if (kTicket && kTicket.preparationStatus) {
        kStatus = kTicket.preparationStatus as any;
      } else {
        const os = (ord.statusName || '').toUpperCase();
        if (os.includes('READY')) kStatus = 'READY';
        else if (os.includes('PREPARING')) kStatus = 'PREPARING';
        else if (os.includes('DELIVERED') || os.includes('SERVED')) kStatus = 'DELIVERED';
        else kStatus = 'RECEIVED';
      }

      return {
        order: ord,
        roundNumber: idx + 1,
        kitchenStatus: kStatus
      };
    });

    this.activeOrders = rounds;
    if (this.selectedOrderTab > rounds.length) {
      this.selectedOrderTab = 0;
    }

    this.cdr.markForCheck();
  }

  get grandTotalAmount(): number {
    return this.activeOrders.reduce((sum, r) => sum + (r.order.totalAmount || 0), 0);
  }

  get totalItemsCount(): number {
    return this.activeOrders.reduce((sum, r) => {
      const itemsQty = (r.order.items || []).reduce((iSum, itm) => iSum + (itm.quantity || 1), 0);
      return sum + itemsQty;
    }, 0);
  }

  get isAllOrdersDelivered(): boolean {
    return this.activeOrders.length > 0 && this.activeOrders.every(r => r.kitchenStatus === 'DELIVERED');
  }

  get hasPreparingOrder(): boolean {
    return this.activeOrders.some(r => r.kitchenStatus === 'PREPARING');
  }

  get hasReadyOrder(): boolean {
    return this.activeOrders.some(r => r.kitchenStatus === 'READY');
  }

  get displayedOrders(): DisplayOrderRound[] {
    if (this.selectedOrderTab === 0) {
      return this.activeOrders;
    }
    const idx = this.selectedOrderTab - 1;
    return this.activeOrders[idx] ? [this.activeOrders[idx]] : this.activeOrders;
  }

  trackByOrderRound(index: number, round: DisplayOrderRound): any {
    return round.order.id || index;
  }

  trackByItemId(index: number, item: any): any {
    return item?.id || item?.menuItemId || item?.menuItemName || index;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.isFullscreen = false;
      }
    }
  }

  // ==========================================
  // Guest Quick Actions
  // ==========================================

  callWaiter(): void {
    this.wsService.callWaiter(this.locationType, this.locationLabel, 'WAITER', 'Guest requested waiter assistance');
    this.showCallFeedback('WAITER', 'Waiter has been notified! A staff member is on the way to your table.');
  }

  requestBill(): void {
    this.wsService.callWaiter(this.locationType, this.locationLabel, 'BILL', 'Guest requested final invoice & bill');
    this.showCallFeedback('BILL', 'Bill requested! The cashier is preparing your invoice.');
  }

  requestWater(): void {
    this.wsService.callWaiter(this.locationType, this.locationLabel, 'WATER', 'Guest requested complimentary water refilled');
    this.showCallFeedback('WATER', 'Water requested! Our dining team is bringing fresh water.');
  }

  private showCallFeedback(type: string, message: string): void {
    this.callState = {
      active: true,
      type,
      message,
      timestamp: new Date()
    };
    this.cdr.markForCheck();

    setTimeout(() => {
      this.callState.active = false;
      this.cdr.markForCheck();
    }, 8000);
  }

  copyWifi(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.wifiPass).then(() => {
        this.copiedWifi = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.copiedWifi = false;
          this.cdr.markForCheck();
        }, 3000);
      });
    }
  }

  changeLocation(): void {
    this.router.navigate(['/display']);
  }
}
