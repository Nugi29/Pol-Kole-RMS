import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LookupRes {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  private readonly backendUrl = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  getAllUserRoles(): Observable<LookupRes[]> {
    return this.http.get<LookupRes[]>(`${this.backendUrl}/list/user-roles`);
  }
  getAllUserStatuses(): Observable<LookupRes[]> {
    return this.http.get<LookupRes[]>(`${this.backendUrl}/list/user-statuses`);
  }
}
