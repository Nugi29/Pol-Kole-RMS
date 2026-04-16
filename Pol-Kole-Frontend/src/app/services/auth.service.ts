import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  role?: string;
  name?: string;
  data?: {
    token?: string;
    role?: string;
    name?: string;
  };
  result?: {
    token?: string;
    role?: string;
    name?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly backendUrl = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  public login(data: LoginPayload) {
    return this.http.post<LoginResponse>(`${this.backendUrl}/user/login`, data);
  }
}

