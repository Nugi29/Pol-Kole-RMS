import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';
import { Page } from './voucher.service';
import { environment } from '../../environments/environment';

export interface ItemDiscount {
  id?: number;
  title: string;
  menuItemId: number;
  menuItemName?: string;
  menuItemOriginalPrice?: number;
  discountType: 'PERCENTAGE' | 'FIXED_OFF' | 'SPECIAL_PRICE';
  discountValue: number;
  calculatedDiscountedPrice?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'SCHEDULED';
}

@Injectable({
  providedIn: 'root',
})
export class ItemDiscountService {
  private readonly baseUrl = `${environment.apiUrl}/item-discounts`;

  constructor(private readonly http: HttpClient) {}

  createItemDiscount(discount: ItemDiscount): Observable<ItemDiscount> {
    return this.http.post<ApiResponse<ItemDiscount>>(this.baseUrl, discount).pipe(
      map(res => res.data)
    );
  }

  updateItemDiscount(id: number, discount: ItemDiscount): Observable<ItemDiscount> {
    return this.http.put<ApiResponse<ItemDiscount>>(`${this.baseUrl}/${id}`, discount).pipe(
      map(res => res.data)
    );
  }

  deleteItemDiscount(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  getItemDiscountById(id: number): Observable<ItemDiscount> {
    return this.http.get<ApiResponse<ItemDiscount>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  searchItemDiscounts(search?: string, page: number = 0, size: number = 10): Observable<Page<ItemDiscount>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<Page<ItemDiscount>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  getAllActiveItemDiscounts(): Observable<ItemDiscount[]> {
    return this.http.get<ApiResponse<ItemDiscount[]>>(`${this.baseUrl}/active`).pipe(
      map(res => res.data)
    );
  }

  toggleActiveStatus(id: number): Observable<ItemDiscount> {
    return this.http.patch<ApiResponse<ItemDiscount>>(`${this.baseUrl}/${id}/toggle-status`, {}).pipe(
      map(res => res.data)
    );
  }

  getEffectivePrice(menuItemId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/effective-price/${menuItemId}`).pipe(
      map(res => res.data)
    );
  }
}
