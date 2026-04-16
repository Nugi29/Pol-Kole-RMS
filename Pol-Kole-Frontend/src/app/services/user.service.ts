import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginPayload, LoginResponse } from './auth.service';
import { Observable } from 'rxjs';

export interface FullUserRes {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdOn?: string | Date | null;
  status: {
    id: number;
    name: string;
  };
  role: {
    id: number;
    name: string;
  };
}

export interface UpdateUserPayload {
  id?: number;
  name: string;
  email: string;
  password?: string;
  phone: string;
  role?: string;
  status?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly backendUrl = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  public async login(data: LoginPayload) {
    return this.http.post<LoginResponse>(`${this.backendUrl}/user/`, data);
  }

  getAllUsers(): Observable<FullUserRes[]> {
    return this.http.get<FullUserRes[]>(`${this.backendUrl}/user/get-all`);
  }

  create(data: CreateUserPayload): Observable<string> {
    const payload: CreateUserPayload = {
      ...data,
      phone: String(data.phone ?? '').trim(),
    };

    return this.http.post(`${this.backendUrl}/user/register`, payload, {
      responseType: 'text',
    });
  }

  update(id: number, data: UpdateUserPayload): Observable<FullUserRes> {
    return this.http.put<FullUserRes>(`${this.backendUrl}/user/update/${id}`, data);
  }

  delete(id:number): Observable<string> {
    return this.http.delete(`${this.backendUrl}/user/delete/${id}`, {
      responseType: 'text',
    });
  }


}
