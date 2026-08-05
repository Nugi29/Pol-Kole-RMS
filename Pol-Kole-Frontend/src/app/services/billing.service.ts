import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id?: number;
  orderId?: number;
  reservationId?: number;
  tableReservationId?: number;
  invoiceNumber: string;
  orderSubtotal?: number;
  roomCharges?: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string; // UNPAID, PAID
  items: InvoiceItem[];
  paymentMethodName?: string;
  transactionReference?: string;
}

export interface PaymentPayload {
  invoiceId: number;
  amount: number;
  paymentMethodName: string; // CASH, CARD, ONLINE
  transactionReference?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  private readonly baseUrl = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  generateInvoice(reservationId: number, discountCode?: string, redeemPoints: number = 0): Observable<Invoice> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/generate/${reservationId}`, {
      discountCode,
      redeemPoints,
    }).pipe(map(res => res.data));
  }

  generateStayInvoice(reservationId: number, discountCode?: string, redeemPoints: number = 0): Observable<Invoice> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/generate/stay/${reservationId}`, {
      discountCode,
      redeemPoints,
    }).pipe(map(res => res.data));
  }

  generateTableInvoice(reservationId: number, discountCode?: string, redeemPoints: number = 0): Observable<Invoice> {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/generate/table/${reservationId}`, {
      discountCode,
      redeemPoints,
    }).pipe(map(res => res.data));
  }

  processPayment(payload: PaymentPayload): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/payments`, payload).pipe(
      map(() => undefined)
    );
  }

  getInvoiceByReservation(reservationId: number): Observable<Invoice> {
    return this.http.get<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/reservation/${reservationId}`).pipe(
      map(res => res.data)
    );
  }

  getAllInvoices(): Observable<Invoice[]> {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.baseUrl}/invoices`).pipe(
      map(res => res.data)
    );
  }

  downloadInvoicePdf(invoiceId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
  }
}
