import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface InventoryItem {
  id?: number;
  itemName: string;
  quantity: number;
  supplier: string;
  expiryDate?: string;
  stockLevel: number;
  warningThreshold: number;
}

export interface StockTransaction {
  id?: number;
  inventoryItemId: number;
  itemName?: string;
  transactionType: string; // IN, OUT
  quantity: number;
  reason: string;
  transactionTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly baseUrl = 'http://localhost:8080/api/inventory';

  constructor(private readonly http: HttpClient) {}

  filterInventory(search?: string, page: number = 0, size: number = 15): Observable<Page<InventoryItem>> {
    let params: any = { page: String(page), size: String(size) };
    if (search) params.search = search;

    return this.http.get<ApiResponse<Page<InventoryItem>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createItem(item: InventoryItem): Observable<InventoryItem> {
    return this.http.post<ApiResponse<InventoryItem>>(this.baseUrl, item).pipe(
      map(res => res.data)
    );
  }

  updateItem(id: number, item: InventoryItem): Observable<InventoryItem> {
    return this.http.put<ApiResponse<InventoryItem>>(`${this.baseUrl}/${id}`, item).pipe(
      map(res => res.data)
    );
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  restockItem(id: number, quantity: number, reason: string): Observable<StockTransaction> {
    return this.http.post<ApiResponse<StockTransaction>>(`${this.baseUrl}/${id}/restock?quantity=${quantity}&reason=${reason}`, {}).pipe(
      map(res => res.data)
    );
  }

  deductItem(id: number, quantity: number, reason: string): Observable<StockTransaction> {
    return this.http.post<ApiResponse<StockTransaction>>(`${this.baseUrl}/${id}/deduct?quantity=${quantity}&reason=${reason}`, {}).pipe(
      map(res => res.data)
    );
  }

  getTransactionHistory(id: number, page: number = 0, size: number = 10): Observable<Page<StockTransaction>> {
    return this.http.get<ApiResponse<Page<StockTransaction>>>(`${this.baseUrl}/${id}/history?page=${page}&size=${size}`).pipe(
      map(res => res.data)
    );
  }

  getLowStockItems(): Observable<InventoryItem[]> {
    return this.http.get<ApiResponse<InventoryItem[]>>(`${this.baseUrl}/alerts`).pipe(
      map(res => res.data)
    );
  }
}
