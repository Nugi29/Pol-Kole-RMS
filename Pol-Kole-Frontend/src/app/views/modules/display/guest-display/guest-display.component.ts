import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { WebsocketService, GuestServiceCall, GuestCallType } from '../../../../services/websocket.service';
import { Order, OrderService } from '../../../../services/order.service';
import { KitchenOrder } from '../../kitchen/kitchen.component';
import { TableService, RestaurantTable } from '../../../../services/table.service';
import { RoomService, Room } from '../../../../services/room.service';
import { Reservation, ReservationService } from '../../../../services/reservation.service';
import { MenuService, MenuCategory, MenuItem } from '../../../../services/menu.service';
import { ItemDiscount, ItemDiscountService } from '../../../../services/item-discount.service';
import { SettingsService } from '../../../../services/settings.service';

export interface DisplayOrderRound {
  order: Order;
  roundNumber: number;
  backendStatus: string; // PENDING, PREPARING, READY, SERVED, COMPLETED, CANCELLED
  customerStatusTitle: string;
  customerStatusSubtitle: string;
  badgeClass: string;
  icon: string;
  progressPercent: number;
  stageIndex: number; // 0: Placed, 1: Kitchen, 2: Ready, 3: Served
}

export interface ServiceOptionItem {
  type: GuestCallType;
  icon: string;
  title: string;
  desc: string;
  bgGradient?: string;
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
  isDarkMode = true;

  // Active Service Requests for this specific table/room
  myActiveCalls: GuestServiceCall[] = [];

  // Modals & Interactive Drawers
  showMenuModal = false;
  showServiceModal = false;
  showBillModal = false;
  selectedCategory: number | null = null; // null for All, -1 for Special Deals
  menuSearchTerm = '';
  menuCategories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  activeDiscounts: ItemDiscount[] = [];
  loadingMenu = false;

  // Banner notification feedback
  callFeedback: { active: boolean; type: string; title: string; message: string; timestamp: Date | null } = {
    active: false,
    type: '',
    title: '',
    message: '',
    timestamp: null
  };

  // WiFi Info
  wifiName = 'POL_KOLE_GUEST_5G';
  wifiPass = 'PolKole2026';
  copiedWifi = false;

  // Table specific amenities
  readonly tableServiceOptions: ServiceOptionItem[] = [
    { type: 'WATER', icon: '💧', title: 'Refill Water', desc: 'Complimentary iced water refilled at table' },
    { type: 'CUTLERY', icon: '🍴', title: 'Extra Cutlery', desc: 'Plates, forks, spoons & dining napkins' },
    { type: 'CLEANING', icon: '🧹', title: 'Table Cleaning', desc: 'Tidy & clean table surface' },
    { type: 'ASSISTANCE', icon: '🙋', title: 'Waiter Help', desc: 'Personal assistance for table requests' }
  ];

  // Room specific amenities
  readonly roomServiceOptions: ServiceOptionItem[] = [
    { type: 'HOUSEKEEPING', icon: '🧹', title: 'Housekeeping', desc: 'Daily room tidy-up & bed making' },
    { type: 'TOWELS', icon: '🧖', title: 'Fresh Towels', desc: 'Set of fresh bath & hand towels' },
    { type: 'TOILETRIES', icon: '🧴', title: 'Amenities Kit', desc: 'Shampoo, luxury body soap & kits' },
    { type: 'WATER', icon: '💧', title: 'Mineral Water', desc: 'Sealed mineral water bottles' },
    { type: 'RECEPTION', icon: '🛎️', title: 'Front Desk', desc: 'Front desk reception assistance' },
    { type: 'ASSISTANCE', icon: '🧳', title: 'General Support', desc: 'Baggage or in-room concierge assistance' }
  ];

  private clockSub: Subscription | null = null;
  private routeSub: Subscription | null = null;
  private ordersSub: Subscription | null = null;
  private callsSub: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly wsService: WebsocketService,
    private readonly orderService: OrderService,
    private readonly tableService: TableService,
    private readonly roomService: RoomService,
    private readonly reservationService: ReservationService,
    private readonly menuService: MenuService,
    private readonly itemDiscountService: ItemDiscountService,
    private readonly cdr: ChangeDetectorRef,
    public readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    // 0. Initialize Dark/Light mode
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme ? savedTheme === 'dark' : true;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 1. Live Clock
    this.clockSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    });

    // 2. Route detection (/display/table/:tableId or /display/room/:roomId)
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
      this.listenToOrdersAndCalls();
    });

    // 3. Preload menu items in background
    this.loadMenuData();
  }

  ngOnDestroy(): void {
    if (this.clockSub) this.clockSub.unsubscribe();
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.ordersSub) this.ordersSub.unsubscribe();
    if (this.callsSub) this.callsSub.unsubscribe();
  }

  get isRoom(): boolean {
    return this.locationType === 'ROOM';
  }

  get isTable(): boolean {
    return this.locationType === 'TABLE';
  }

  private loadTableInfo(id: number): void {
    this.tableService.getTableById(id).subscribe({
      next: (t: RestaurantTable) => {
        this.locationDetail = t;
        this.locationLabel = `Table ${t.tableNumber || id}`;
        this.loadTableReservation(id);
        this.filterMyCalls();
        this.cdr.markForCheck();
      },
      error: () => {
        this.locationLabel = `Table #${id}`;
        this.cdr.markForCheck();
      }
    });
  }

  private loadTableReservation(tableId: number): void {
    // If table status is not RESERVED, it is an AVAILABLE table -> never show reservation details
    if (this.locationDetail?.status !== 'RESERVED') {
      this.activeReservation = null;
      this.cdr.markForCheck();
      return;
    }

    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.reservationService.filterReservations(undefined, tableId, undefined, todayFormatted, todayFormatted, 0, 10).subscribe({
      next: (page) => {
        const reservations = page?.content || [];
        const validToday = reservations.find(r => {
          const status = (r.reservationStatusName || '').toUpperCase();
          if (status.includes('CANCEL') || status.includes('COMPLETE')) return false;
          return r.reservationDate === todayFormatted;
        });

        this.activeReservation = validToday || null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeReservation = null;
        this.cdr.markForCheck();
      }
    });
  }

  private loadRoomInfo(id: number): void {
    this.roomService.getRoomById(id).subscribe({
      next: (r: Room) => {
        this.locationDetail = r;
        this.locationLabel = `Room ${r.roomNumber || id}`;
        this.filterMyCalls();
        this.cdr.markForCheck();
      },
      error: () => {
        this.locationLabel = `Room #${id}`;
        this.cdr.markForCheck();
      }
    });
  }

  private listenToOrdersAndCalls(): void {
    if (this.ordersSub) this.ordersSub.unsubscribe();
    if (this.callsSub) this.callsSub.unsubscribe();

    this.ordersSub = this.wsService.allOrders$.subscribe(orders => {
      const kitchenTickets = this.wsService.kitchenOrders$.value || [];
      this.findActiveOrders(orders, kitchenTickets);
    });

    this.callsSub = this.wsService.activeGuestCalls$.subscribe(calls => {
      this.filterMyCalls(calls);
    });

    this.wsService.refreshAllData();
  }

  private filterMyCalls(calls?: GuestServiceCall[]): void {
    const list = calls || this.wsService.activeGuestCalls$.value || [];
    if (!this.locationId && !this.locationLabel) {
      this.myActiveCalls = [];
      return;
    }

    const cleanLabel = this.locationLabel.replace(/\s+/g, '').toUpperCase();
    this.myActiveCalls = list.filter(c => {
      if (c.locationType !== this.locationType) return false;
      if (c.locationId && c.locationId === this.locationId) return true;
      const cNum = (c.locationNumber || '').replace(/\s+/g, '').toUpperCase();
      return cNum === cleanLabel || cNum.includes(String(this.locationId));
    }).filter(c => c.status !== 'COMPLETED');

    this.cdr.markForCheck();
  }

  private findActiveOrders(orders: Order[], kitchenTickets: KitchenOrder[]): void {
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

    // Active orders (non-cancelled and non-completed/paid)
    const activeList = matching
      .filter(o => {
        const s = (o.statusName || '').toUpperCase();
        return !s.includes('CANCEL') && !s.includes('PAID') && !s.includes('COMPLETED');
      })
      .filter(o => this.isToday(o.orderTime))
      .sort((a, b) => (a.id || 0) - (b.id || 0));

    const rounds: DisplayOrderRound[] = activeList.map((ord, idx) => {
      // Deterministically sort items
      if (ord.items && ord.items.length > 0) {
        ord.items = [...ord.items].sort((a, b) => {
          const idA = a.id ?? a.menuItemId ?? 0;
          const idB = b.id ?? b.menuItemId ?? 0;
          if (idA !== idB) return idA - idB;
          return (a.menuItemName || '').localeCompare(b.menuItemName || '');
        });
      }

      // Determine friendly status translation
      const kTicket = kitchenTickets.find(kt => kt.orderId === ord.id);
      const rawStatus = (kTicket?.preparationStatus || ord.statusName || 'PENDING').toUpperCase();

      let backendStatus = 'PENDING';
      let title = 'Order Received';
      let subtitle = this.isRoom
        ? 'Your room service order has been received by our kitchen.'
        : 'Your order has been received. Please wait while our kitchen prepares your meal.';
      let badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      let icon = '🕐';
      let progressPercent = 25;
      let stageIndex = 0;

      if (rawStatus.includes('PREPARING')) {
        backendStatus = 'PREPARING';
        title = 'Your Meal Is Being Prepared';
        subtitle = this.isRoom
          ? 'Our chefs are cooking your fresh in-room dining meal.'
          : 'Our chefs are cooking your fresh dishes. Relax and enjoy your time.';
        badgeClass = 'bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse';
        icon = '👨‍🍳';
        progressPercent = 50;
        stageIndex = 1;
      } else if (rawStatus.includes('READY')) {
        backendStatus = 'READY';
        title = this.isRoom ? 'Your Order Is Ready for Delivery' : 'Your Order Is Ready';
        subtitle = this.isRoom
          ? 'Your in-room dining meal is ready. Staff is delivering to your room.'
          : 'Your meal is freshly prepared. Staff is serving your table.';
        badgeClass = 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 animate-bounce';
        icon = '🔔';
        progressPercent = 80;
        stageIndex = 2;
      } else if (rawStatus.includes('DELIVERED') || rawStatus.includes('SERVED')) {
        backendStatus = 'SERVED';
        title = 'Enjoy Your Meal!';
        subtitle = this.isRoom
          ? 'Your in-room dining order has been delivered. Bon appétit!'
          : 'Your order has been served. Enjoy your meal!';
        badgeClass = 'bg-teal-500/25 text-teal-300 border-teal-500/40';
        icon = '🍽️';
        progressPercent = 100;
        stageIndex = 3;
      } else if (rawStatus.includes('COMPLETED')) {
        backendStatus = 'COMPLETED';
        title = 'Thank You!';
        subtitle = `Thank you for choosing ${this.settingsService.restaurantShortName()}! We hope you had a wonderful experience.`;
        badgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
        icon = '✓';
        progressPercent = 100;
        stageIndex = 3;
      } else if (rawStatus.includes('CANCEL')) {
        backendStatus = 'CANCELLED';
        title = 'Order Cancelled';
        subtitle = 'This order has been cancelled.';
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        icon = '❌';
        progressPercent = 0;
        stageIndex = 0;
      }

      return {
        order: ord,
        roundNumber: idx + 1,
        backendStatus,
        customerStatusTitle: title,
        customerStatusSubtitle: subtitle,
        badgeClass,
        icon,
        progressPercent,
        stageIndex
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
    return this.activeOrders.length > 0 && this.activeOrders.every(r => r.backendStatus === 'SERVED');
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

  private isToday(orderOrDate?: any): boolean {
    if (!orderOrDate) return true;
    let dateVal: any = orderOrDate;
    if (typeof orderOrDate === 'object' && !(orderOrDate instanceof Date)) {
      dateVal = orderOrDate.orderTime || orderOrDate.orderDate || orderOrDate.createdAt || orderOrDate.createdDate || orderOrDate.date;
    }
    if (!dateVal) return true;
    try {
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayFormatted = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
      if (typeof dateVal === 'string' && dateVal.trim().startsWith(todayFormatted)) {
        return true;
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return (
          d.getFullYear() === todayYear &&
          (d.getMonth() + 1) === todayMonth &&
          d.getDate() === todayDay
        );
      }
      return false;
    } catch {
      return true;
    }
  }

  get activeLocationNumber(): string {
    if (this.isTable && this.locationDetail) {
      return (this.locationDetail as RestaurantTable).tableNumber || this.locationLabel;
    }
    if (this.isRoom && this.locationDetail) {
      return (this.locationDetail as Room).roomNumber || this.locationLabel;
    }
    return this.locationLabel;
  }

  callWaiter(): void {
    const locNum = this.activeLocationNumber;
    this.wsService.callWaiter(
      this.locationType,
      locNum,
      'WAITER',
      'Guest requested waiter assistance at table',
      this.locationId || undefined
    ).subscribe((res) => {
      const staffName = res.assignedStaffName ? ` (Assigned: ${res.assignedStaffName})` : '';
      const feedbackMsg = res.isFallback && res.fallbackReason 
        ? `${res.message} - ${res.fallbackReason}` 
        : `A staff member${staffName} has received your call and is coming to your table.`;
      this.showCallFeedback('WAITER', 'Waiter Notified', feedbackMsg);
    });
  }

  callReception(): void {
    const locNum = this.activeLocationNumber;
    this.wsService.callWaiter(
      this.locationType,
      locNum,
      'RECEPTION',
      'Guest requested reception assistance from room',
      this.locationId || undefined
    ).subscribe((res) => {
      this.showCallFeedback('RECEPTION', 'Reception Notified', res.message || 'Front desk has received your request and will assist you shortly.');
    });
  }

  requestBill(): void {
    const locNum = this.activeLocationNumber;
    this.wsService.callWaiter(
      this.locationType,
      locNum,
      'BILL',
      'Guest requested final invoice & bill',
      this.locationId || undefined
    ).subscribe(() => {
      this.showCallFeedback(
        'BILL',
        'Bill Requested',
        `Your bill request has been sent to the cashier. Please wait while your invoice is printed for ${this.locationLabel}.`
      );
      this.showBillModal = false;
    });
  }

  requestService(callType: GuestCallType, customMsg?: string): void {
    const locNum = this.activeLocationNumber;
    this.wsService.callWaiter(
      this.locationType,
      locNum,
      callType,
      customMsg,
      this.locationId || undefined
    ).subscribe((res) => {
      let title = 'Service Requested';
      if (callType === 'WATER') title = 'Water Requested';
      else if (callType === 'CUTLERY') title = 'Cutlery Requested';
      else if (callType === 'CLEANING') title = 'Cleaning Requested';
      else if (callType === 'HOUSEKEEPING') title = 'Housekeeping Requested';
      else if (callType === 'TOWELS') title = 'Fresh Towels Requested';
      else if (callType === 'TOILETRIES') title = 'Amenities Kit Requested';
      else if (callType === 'RECEPTION') title = 'Reception Called';

      const staffInfo = res.assignedStaffName ? ` (${res.assignedStaffName} attending)` : '';
      this.showCallFeedback(callType, title, (res.message || 'Our team has received your request and is attending to it.') + staffInfo);
      this.showServiceModal = false;
    });
  }

  private showCallFeedback(type: string, title: string, message: string): void {
    this.callFeedback = {
      active: true,
      type,
      title,
      message,
      timestamp: new Date()
    };
    this.cdr.markForCheck();

    setTimeout(() => {
      this.callFeedback.active = false;
      this.cdr.markForCheck();
    }, 8000);
  }

  arriveAndSeatGuest(): void {
    if (this.locationType === 'TABLE' && this.locationId) {
      this.tableService.updateTableStatus(this.locationId, 'OCCUPIED').subscribe({
        next: () => {
          if (this.locationDetail) {
            this.locationDetail.status = 'OCCUPIED';
          }
          this.wsService.sendMessage('TABLE_UPDATED', { tableId: this.locationId, status: 'OCCUPIED' });
          this.wsService.callWaiter(
            'TABLE',
            this.locationLabel,
            'WAITER',
            `Reserved guest (${this.activeReservation?.customerName || 'VIP Guest'}) has arrived and is seated!`,
            this.locationId || undefined
          );
          this.showCallFeedback('WAITER', 'Welcome!', `Welcome to ${this.settingsService.restaurantShortName()}! Your waiter has been notified of your arrival.`);
          this.cdr.markForCheck();
        },
        error: () => {
          this.showCallFeedback('WAITER', 'Welcome!', 'Welcome! Please notify your waiter to begin service.');
        }
      });
    }
  }

  // ==========================================
  // Digital Menu Viewer Modal Logic
  // ==========================================

  openMenuModal(): void {
    this.showMenuModal = true;
    if (this.menuCategories.length === 0 || this.menuItems.length === 0) {
      this.loadMenuData();
    }
  }

  closeMenuModal(): void {
    this.showMenuModal = false;
  }

  private loadMenuData(): void {
    this.loadingMenu = true;
    this.menuService.getCategories().subscribe({
      next: (cats) => {
        this.menuCategories = cats || [];
        this.cdr.markForCheck();
      }
    });

    this.itemDiscountService.getAllActiveItemDiscounts().subscribe({
      next: (discounts) => {
        this.activeDiscounts = discounts || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeDiscounts = [];
      }
    });

    this.menuService.filterMenuItems(undefined, true, undefined, 0, 150).subscribe({
      next: (page) => {
        this.menuItems = page?.content || [];
        this.loadingMenu = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingMenu = false;
      }
    });
  }

  get hasSpecialDeals(): boolean {
    return this.activeDiscounts.length > 0;
  }

  get specialDealsCount(): number {
    return this.activeDiscounts.length;
  }

  getItemDiscount(item: MenuItem): ItemDiscount | undefined {
    if (!item || !item.id) return undefined;
    return this.activeDiscounts.find(d => d.menuItemId === item.id);
  }

  getItemFinalPrice(item: MenuItem): number {
    const discount = this.getItemDiscount(item);
    if (!discount) return item.price;
    if (discount.calculatedDiscountedPrice != null && discount.calculatedDiscountedPrice >= 0) {
      return discount.calculatedDiscountedPrice;
    }
    if (discount.discountType === 'PERCENTAGE') {
      return Math.max(0, item.price * (1 - discount.discountValue / 100));
    } else if (discount.discountType === 'FIXED_OFF') {
      return Math.max(0, item.price - discount.discountValue);
    } else if (discount.discountType === 'SPECIAL_PRICE') {
      return discount.discountValue;
    }
    return item.price;
  }

  getDiscountBadgeText(discount: ItemDiscount): string {
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.discountValue}% OFF`;
    } else if (discount.discountType === 'FIXED_OFF') {
      return `Rs. ${discount.discountValue} OFF`;
    } else if (discount.discountType === 'SPECIAL_PRICE') {
      return 'SPECIAL DEAL';
    }
    return 'HOT DEAL';
  }

  get filteredMenuItems(): MenuItem[] {
    let list = this.menuItems;
    if (this.selectedCategory === -1) {
      // Filter only items that have an active special deal
      list = list.filter(i => !!this.getItemDiscount(i));
    } else if (this.selectedCategory) {
      list = list.filter(i => i.categoryId === this.selectedCategory);
    }
    if (this.menuSearchTerm.trim()) {
      const term = this.menuSearchTerm.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(term) ||
        (i.description && i.description.toLowerCase().includes(term))
      );
    }
    return list;
  }

  getCategoryIcon(catName?: string): string {
    if (!catName) return '🍽️';
    const n = catName.toLowerCase();
    if (n.includes('deal') || n.includes('offer') || n.includes('promo')) return '🔥';
    if (n.includes('starter') || n.includes('appetizer')) return '🥗';
    if (n.includes('main') || n.includes('curry') || n.includes('rice')) return '🍲';
    if (n.includes('burger') || n.includes('sandwich') || n.includes('fast')) return '🍔';
    if (n.includes('seafood') || n.includes('fish') || n.includes('prawn')) return '🦐';
    if (n.includes('dessert') || n.includes('sweet') || n.includes('cake')) return '🍰';
    if (n.includes('beverage') || n.includes('drink') || n.includes('juice') || n.includes('coffee')) return '🍹';
    return '🍽️';
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    const themeStr = this.isDarkMode ? 'dark' : 'light';
    localStorage.setItem('theme', themeStr);
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.cdr.markForCheck();
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
