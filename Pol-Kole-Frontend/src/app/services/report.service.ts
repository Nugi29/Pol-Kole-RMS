import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

// 1. Daily Flash
export interface PaymentBreakdown {
  paymentMethod: string;
  transactionCount: number;
  totalAmount: number;
  percentage: number;
}

export interface ChannelRevenue {
  channel: string;
  count: number;
  totalRevenue: number;
  percentage: number;
}

export interface DailyFlashReport {
  period: string;
  grossSales: number;
  totalTax: number;
  totalDiscounts: number;
  netRevenue: number;
  totalOrders: number;
  totalInvoices: number;
  averageOrderValue: number;
  paymentMethods: PaymentBreakdown[];
  channelRevenues: ChannelRevenue[];
}

// 2. Menu Sales
export interface MenuItemSales {
  itemId: number;
  itemName: string;
  categoryName: string;
  unitPrice: number;
  quantitySold: number;
  totalRevenue: number;
  salesContributionPercent: number;
  isAvailable: boolean;
  performanceTag: string;
}

export interface CategorySales {
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  revenueSharePercent: number;
}

export interface MenuSalesReport {
  period: string;
  totalMenuItems: number;
  activeItemsSold: number;
  totalUnitsSold: number;
  totalMenuRevenue: number;
  categoryBreakdown: CategorySales[];
  fullMenuList: MenuItemSales[];
}

// 3. Hotel Performance
export interface RoomTypePerformance {
  roomTypeName: string;
  totalRoomsOfType: number;
  totalStays: number;
  defaultPrice: number;
  generatedRevenue: number;
  utilizationRate: number;
}

export interface HotelPerformanceReport {
  period: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  totalRoomRevenue: number;
  averageDailyRate: number;
  revPar: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  avgLengthOfStayDays: number;
  roomTypeBreakdown: RoomTypePerformance[];
}

// 4. Kitchen Efficiency
export interface ChefStationPerformance {
  station: string;
  ordersHandled: number;
  avgPrepTimeMinutes: number;
  assignedChefName: string;
}

export interface KitchenEfficiencyReport {
  period: string;
  totalOrdersPrepared: number;
  averagePreparationTimeMinutes: number;
  onTimeOrders: number;
  delayedOrders: number;
  onTimeRatePercent: number;
  stationBreakdown: ChefStationPerformance[];
}

// 5. Staff Productivity
export interface WaiterSalesPerformance {
  waiterId: number;
  waiterName: string;
  ordersServed: number;
  totalSalesGenerated: number;
  avgTicketSize: number;
  rank: number;
}

export interface StaffAttendanceSummary {
  staffId: number;
  staffName: string;
  roleName: string;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalHoursWorked: number;
}

export interface StaffProductivityReport {
  period: string;
  totalStaffMembers: number;
  totalPresentToday: number;
  totalAbsentToday: number;
  totalLateToday: number;
  waiterSales: WaiterSalesPerformance[];
  attendanceSummary: StaffAttendanceSummary[];
}

// 6. Customer VIP
export interface VipCustomer {
  customerId: number;
  customerName: string;
  phone: string;
  nationality: string;
  loyaltyPoints: number;
  totalVisits: number;
  lifetimeSpend: number;
}

export interface NationalityDistribution {
  nationality: string;
  guestCount: number;
  percentage: number;
}

export interface CustomerIntelligenceReport {
  totalCustomers: number;
  totalLoyaltyPointsIssued: number;
  repeatCustomerRatePercent: number;
  topVipCustomers: VipCustomer[];
  nationalityDistribution: NationalityDistribution[];
}

// 7. Discount Audit
export interface CashierDiscountAudit {
  staffUsername: string;
  billsDiscounted: number;
  totalDiscountAmount: number;
  totalBillAmount: number;
}

export interface DiscountAuditReport {
  period: string;
  totalDiscountsGiven: number;
  discountedInvoicesCount: number;
  averageDiscountAmount: number;
  totalVouchersRedeemed: number;
  voucherDiscountTotal: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesTotal: number;
  cashierDiscounts: CashierDiscountAudit[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  private buildParams(startDate?: string, endDate?: string): HttpParams {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return params;
  }

  getDailyFlashReport(startDate?: string, endDate?: string): Observable<ApiResponse<DailyFlashReport>> {
    return this.http.get<ApiResponse<DailyFlashReport>>(`${this.baseUrl}/daily-flash`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  getMenuSalesReport(startDate?: string, endDate?: string): Observable<ApiResponse<MenuSalesReport>> {
    return this.http.get<ApiResponse<MenuSalesReport>>(`${this.baseUrl}/menu-sales`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  getHotelPerformanceReport(startDate?: string, endDate?: string): Observable<ApiResponse<HotelPerformanceReport>> {
    return this.http.get<ApiResponse<HotelPerformanceReport>>(`${this.baseUrl}/hotel-performance`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  getKitchenEfficiencyReport(startDate?: string, endDate?: string): Observable<ApiResponse<KitchenEfficiencyReport>> {
    return this.http.get<ApiResponse<KitchenEfficiencyReport>>(`${this.baseUrl}/kitchen-efficiency`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  getStaffProductivityReport(startDate?: string, endDate?: string): Observable<ApiResponse<StaffProductivityReport>> {
    return this.http.get<ApiResponse<StaffProductivityReport>>(`${this.baseUrl}/staff-productivity`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  getCustomerIntelligenceReport(): Observable<ApiResponse<CustomerIntelligenceReport>> {
    return this.http.get<ApiResponse<CustomerIntelligenceReport>>(`${this.baseUrl}/customer-intelligence`);
  }

  getDiscountAuditReport(startDate?: string, endDate?: string): Observable<ApiResponse<DiscountAuditReport>> {
    return this.http.get<ApiResponse<DiscountAuditReport>>(`${this.baseUrl}/discount-audit`, {
      params: this.buildParams(startDate, endDate),
    });
  }

  downloadReportPdf(reportType: string, startDate?: string, endDate?: string): Observable<Blob> {
    let params = this.buildParams(startDate, endDate).set('reportType', reportType);
    return this.http.get(`${this.baseUrl}/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  exportToCsv(filename: string, rows: Record<string, any>[], headers: { key: string; label: string }[]): void {
    if (!rows || rows.length === 0) return;

    const separator = ',';
    const csvContent = [
      headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(separator),
      ...rows.map(row =>
        headers
          .map(h => {
            const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(separator)
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
