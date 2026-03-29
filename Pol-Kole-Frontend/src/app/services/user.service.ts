import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginPayload, LoginResponse } from './auth.service';
import { Observable } from 'rxjs';
import { LookupRes } from './lookup.service';

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
}
