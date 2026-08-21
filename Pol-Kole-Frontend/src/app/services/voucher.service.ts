import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';

export interface Voucher {
  id?: number;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minBillAmount?: number;
  maxDiscountAmount?: number;
  activeFrom: string;
  activeTo: string;
  usageLimit?: number;
  usageCount?: number;
  isActive?: boolean;
  applicableType?: 'ALL' | 'TAKEAWAY' | 'TABLE' | 'ROOM';
  status?: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'EXHAUSTED';
  previewDiscountAmount?: number;
  valid?: boolean;
  validationMessage?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private readonly baseUrl = 'http://localhost:8080/api/vouchers';

  constructor(private readonly http: HttpClient) {}

  createVoucher(voucher: Voucher): Observable<Voucher> {
    return this.http.post<ApiResponse<Voucher>>(this.baseUrl, voucher).pipe(
      map(res => res.data)
    );
  }

  updateVoucher(id: number, voucher: Voucher): Observable<Voucher> {
    return this.http.put<ApiResponse<Voucher>>(`${this.baseUrl}/${id}`, voucher).pipe(
      map(res => res.data)
    );
  }

  deleteVoucher(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  getVoucherById(id: number): Observable<Voucher> {
    return this.http.get<ApiResponse<Voucher>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  searchVouchers(search?: string, page: number = 0, size: number = 10): Observable<Page<Voucher>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<Page<Voucher>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  getActiveValidVouchers(): Observable<Voucher[]> {
    return this.http.get<ApiResponse<Voucher[]>>(`${this.baseUrl}/active`).pipe(
      map(res => res.data)
    );
  }

  validateVoucher(code: string, billAmount: number = 0, orderType: string = 'ALL'): Observable<Voucher> {
    let params = new HttpParams()
      .set('code', code)
      .set('billAmount', billAmount.toString())
      .set('orderType', orderType);
    return this.http.get<ApiResponse<Voucher>>(`${this.baseUrl}/validate`, { params }).pipe(
      map(res => res.data)
    );
  }

  toggleActiveStatus(id: number): Observable<Voucher> {
    return this.http.patch<ApiResponse<Voucher>>(`${this.baseUrl}/${id}/toggle-status`, {}).pipe(
      map(res => res.data)
    );
  }
}
