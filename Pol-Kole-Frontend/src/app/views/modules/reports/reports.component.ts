import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ReportService,
  DailyFlashReport,
  MenuSalesReport,
  MenuItemSales,
  HotelPerformanceReport,
  KitchenEfficiencyReport,
  StaffProductivityReport,
  WaiterSalesPerformance,
  CustomerIntelligenceReport,
  VipCustomer,
  DiscountAuditReport,
} from '../../../services/report.service';
import { SettingsService } from '../../../services/settings.service';

export type ReportTab = 'flash' | 'menu' | 'hotel' | 'kitchen' | 'staff' | 'customer' | 'audit';

@Component({
  selector: 'app-reports',
  standalone: false,
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit, OnDestroy {
  activeTab: ReportTab = 'flash';

  // Date Range
  startDate: string = '';
  endDate: string = '';
  activePreset: string = 'month';

  // States
  loading: boolean = false;
  downloadingPdf: boolean = false;
  errorMessage: string = '';

  // Data Holders
  dailyFlashData: DailyFlashReport | null = null;
  menuSalesData: MenuSalesReport | null = null;
  hotelData: HotelPerformanceReport | null = null;
  kitchenData: KitchenEfficiencyReport | null = null;
  staffData: StaffProductivityReport | null = null;
  customerData: CustomerIntelligenceReport | null = null;
  auditData: DiscountAuditReport | null = null;

  // Search filter inside tables
  searchTerm: string = '';

  private querySub?: Subscription;

  constructor(
    private readonly reportService: ReportService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly settingsService: SettingsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyPreset('month', false);

    this.querySub = this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'] as ReportTab;
      if (tabParam && ['flash', 'menu', 'hotel', 'kitchen', 'staff', 'customer', 'audit'].includes(tabParam)) {
        this.activeTab = tabParam;
      }
      this.loadCurrentTabReport();
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.errorMessage = '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  applyPreset(preset: string, reload: boolean = true): void {
    this.activePreset = preset;
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      this.startDate = formatDate(now);
      this.endDate = formatDate(now);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      this.startDate = formatDate(y);
      this.endDate = formatDate(y);
    } else if (preset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      this.startDate = formatDate(w);
      this.endDate = formatDate(now);
    } else if (preset === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate = formatDate(m);
      this.endDate = formatDate(now);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      this.startDate = formatDate(firstDay);
      this.endDate = formatDate(lastDay);
    }

    if (reload) {
      this.loadCurrentTabReport();
    }
  }

  onCustomDateChange(): void {
    this.activePreset = 'custom';
    if (this.startDate && this.endDate) {
      this.loadCurrentTabReport();
    }
  }

  loadCurrentTabReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    console.log(`[Reports] Fetching tab: ${this.activeTab} (${this.startDate} to ${this.endDate})`);

    switch (this.activeTab) {
      case 'flash':
        this.reportService.getDailyFlashReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Daily Flash loaded:', res);
            this.dailyFlashData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'menu':
        this.reportService.getMenuSalesReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Menu Sales loaded:', res);
            this.menuSalesData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'hotel':
        this.reportService.getHotelPerformanceReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Hotel Performance loaded:', res);
            this.hotelData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'kitchen':
        this.reportService.getKitchenEfficiencyReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Kitchen Efficiency loaded:', res);
            this.kitchenData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'staff':
        this.reportService.getStaffProductivityReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Staff Productivity loaded:', res);
            this.staffData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'customer':
        this.reportService.getCustomerIntelligenceReport().subscribe({
          next: res => {
            console.log('[Reports] Customer Intelligence loaded:', res);
            this.customerData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;

      case 'audit':
        this.reportService.getDiscountAuditReport(this.startDate, this.endDate).subscribe({
          next: res => {
            console.log('[Reports] Discount Audit loaded:', res);
            this.auditData = (res as any)?.data ?? res;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => this.handleError(err),
        });
        break;
    }
  }

  private handleError(err: any): void {
    console.error('[Reports] Error loading report:', err);
    this.errorMessage = err?.error?.message || err?.message || 'Failed to load report data. Please verify backend connection.';
    this.loading = false;
    this.cdr.detectChanges();
  }

  downloadPdf(): void {
    this.downloadingPdf = true;
    this.reportService.downloadReportPdf(this.activeTab, this.startDate, this.endDate).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PolKole_${this.activeTab.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.downloadingPdf = false;
      },
      error: err => {
        console.error('PDF download error:', err);
        alert('Failed to generate Jasper PDF report. Please try again.');
        this.downloadingPdf = false;
      },
    });
  }

  exportCsv(): void {
    const filename = `PolKole_${this.activeTab}_Report_${this.startDate}_to_${this.endDate}`;

    if (this.activeTab === 'flash' && this.dailyFlashData) {
      const headers = [
        { key: 'channel', label: 'Revenue Channel' },
        { key: 'count', label: 'Order / Stay Count' },
        { key: 'totalRevenue', label: 'Revenue (Rs.)' },
        { key: 'percentage', label: 'Share (%)' },
      ];
      this.reportService.exportToCsv(filename, this.dailyFlashData.channelRevenues || [], headers);
    } else if (this.activeTab === 'menu' && this.menuSalesData) {
      const headers = [
        { key: 'itemName', label: 'Menu Item Name' },
        { key: 'categoryName', label: 'Category' },
        { key: 'unitPrice', label: 'Unit Price (Rs.)' },
        { key: 'quantitySold', label: 'Units Sold' },
        { key: 'totalRevenue', label: 'Total Revenue (Rs.)' },
        { key: 'salesContributionPercent', label: 'Sales Contribution (%)' },
        { key: 'performanceTag', label: 'Performance Status' },
      ];
      this.reportService.exportToCsv(filename, this.menuSalesData.fullMenuList || [], headers);
    } else if (this.activeTab === 'hotel' && this.hotelData) {
      const headers = [
        { key: 'roomTypeName', label: 'Room Type' },
        { key: 'totalRoomsOfType', label: 'Total Rooms' },
        { key: 'totalStays', label: 'Bookings / Stays' },
        { key: 'defaultPrice', label: 'Nightly Rate (Rs.)' },
        { key: 'generatedRevenue', label: 'Total Revenue (Rs.)' },
        { key: 'utilizationRate', label: 'Utilization (%)' },
      ];
      this.reportService.exportToCsv(filename, this.hotelData.roomTypeBreakdown || [], headers);
    } else if (this.activeTab === 'kitchen' && this.kitchenData) {
      const headers = [
        { key: 'station', label: 'Kitchen Station' },
        { key: 'assignedChefName', label: 'Lead Chef' },
        { key: 'ordersHandled', label: 'Orders Handled' },
        { key: 'avgPrepTimeMinutes', label: 'Avg Prep Time (Mins)' },
      ];
      this.reportService.exportToCsv(filename, this.kitchenData.stationBreakdown || [], headers);
    } else if (this.activeTab === 'staff' && this.staffData) {
      const headers = [
        { key: 'rank', label: 'Sales Rank' },
        { key: 'waiterName', label: 'Staff Member' },
        { key: 'ordersServed', label: 'Orders Served' },
        { key: 'totalSalesGenerated', label: 'Total Sales (Rs.)' },
        { key: 'avgTicketSize', label: 'Avg Ticket (Rs.)' },
      ];
      this.reportService.exportToCsv(filename, this.staffData.waiterSales || [], headers);
    } else if (this.activeTab === 'customer' && this.customerData) {
      const headers = [
        { key: 'customerName', label: 'Guest Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'nationality', label: 'Nationality' },
        { key: 'totalVisits', label: 'Total Visits' },
        { key: 'lifetimeSpend', label: 'Lifetime Spend (Rs.)' },
        { key: 'loyaltyPoints', label: 'Loyalty Points' },
      ];
      this.reportService.exportToCsv(filename, this.customerData.topVipCustomers || [], headers);
    } else if (this.activeTab === 'audit' && this.auditData) {
      const headers = [
        { key: 'staffUsername', label: 'Cashier / Staff' },
        { key: 'billsDiscounted', label: 'Discounted Bills Count' },
        { key: 'totalDiscountAmount', label: 'Total Discount (Rs.)' },
        { key: 'totalBillAmount', label: 'Total Invoiced (Rs.)' },
      ];
      this.reportService.exportToCsv(filename, this.auditData.cashierDiscounts || [], headers);
    }
  }

  filteredMenuItems(): MenuItemSales[] {
    if (!this.menuSalesData?.fullMenuList) return [];
    if (!this.searchTerm.trim()) return this.menuSalesData.fullMenuList;
    const term = this.searchTerm.toLowerCase();
    return this.menuSalesData.fullMenuList.filter(
      item =>
        (item.itemName && item.itemName.toLowerCase().includes(term)) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(term)) ||
        (item.performanceTag && item.performanceTag.toLowerCase().includes(term))
    );
  }

  filteredWaiters(): WaiterSalesPerformance[] {
    if (!this.staffData?.waiterSales) return [];
    if (!this.searchTerm.trim()) return this.staffData.waiterSales;
    const term = this.searchTerm.toLowerCase();
    return this.staffData.waiterSales.filter(w => w.waiterName && w.waiterName.toLowerCase().includes(term));
  }

  filteredCustomers(): VipCustomer[] {
    if (!this.customerData?.topVipCustomers) return [];
    if (!this.searchTerm.trim()) return this.customerData.topVipCustomers;
    const term = this.searchTerm.toLowerCase();
    return this.customerData.topVipCustomers.filter(
      c =>
        (c.customerName && c.customerName.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.nationality && c.nationality.toLowerCase().includes(term))
    );
  }
}
