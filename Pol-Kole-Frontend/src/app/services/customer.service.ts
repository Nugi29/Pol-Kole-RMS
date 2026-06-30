import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface CustomerDto {
  id?: number;
  name: string;
  nicPassport: string;
  email?: string;
  phone: string;
  address?: string;
  nationality?: string;
  loyaltyPoints?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly baseUrl = 'http://localhost:8080/api/customers';

  constructor(private readonly http: HttpClient) {}

  searchCustomers(search?: string, page: number = 0, size: number = 10): Observable<Page<CustomerDto>> {
    const params: any = { page: String(page), size: String(size) };
    if (search) params.search = search;

    return this.http.get<ApiResponse<Page<CustomerDto>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createCustomer(cust: CustomerDto): Observable<CustomerDto> {
    return this.http.post<ApiResponse<CustomerDto>>(this.baseUrl, cust).pipe(
      map(res => res.data)
    );
  }

  updateCustomer(id: number, cust: CustomerDto): Observable<CustomerDto> {
    return this.http.put<ApiResponse<CustomerDto>>(`${this.baseUrl}/${id}`, cust).pipe(
      map(res => res.data)
    );
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
