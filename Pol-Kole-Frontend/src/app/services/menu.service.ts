import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface MenuCategory {
  id?: number;
  name: string;
  description?: string;
}

export interface MenuItem {
  id?: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName?: string;
  availability: boolean;
  preparationTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly baseUrl = 'http://localhost:8080/api/menu';

  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<MenuCategory[]> {
    return this.http.get<ApiResponse<MenuCategory[]>>(`${this.baseUrl}/categories`).pipe(
      map(res => res.data)
    );
  }

  createCategory(category: MenuCategory): Observable<MenuCategory> {
    return this.http.post<ApiResponse<MenuCategory>>(`${this.baseUrl}/categories`, category).pipe(
      map(res => res.data)
    );
  }

  updateCategory(id: number, category: MenuCategory): Observable<MenuCategory> {
    return this.http.put<ApiResponse<MenuCategory>>(`${this.baseUrl}/categories/${id}`, category).pipe(
      map(res => res.data)
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/categories/${id}`).pipe(
      map(() => undefined)
    );
  }

  filterMenuItems(categoryId?: number, isAvailable?: boolean, search?: string, page: number = 0, size: number = 12): Observable<Page<MenuItem>> {
    let params: any = { page: String(page), size: String(size) };
    if (categoryId) params.categoryId = String(categoryId);
    if (isAvailable !== undefined) params.isAvailable = String(isAvailable);
    if (search) params.search = search;

    return this.http.get<ApiResponse<Page<MenuItem>>>(`${this.baseUrl}/items`, { params }).pipe(
      map(res => res.data)
    );
  }

  createMenuItem(item: MenuItem): Observable<MenuItem> {
    return this.http.post<ApiResponse<MenuItem>>(`${this.baseUrl}/items`, item).pipe(
      map(res => res.data)
    );
  }

  updateMenuItem(id: number, item: MenuItem): Observable<MenuItem> {
    return this.http.put<ApiResponse<MenuItem>>(`${this.baseUrl}/items/${id}`, item).pipe(
      map(res => res.data)
    );
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/items/${id}`).pipe(
      map(() => undefined)
    );
  }
}
