import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LookupRes {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class LookupService {
  private readonly backendUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getAllUserRoles(): Observable<LookupRes[]> {
    return this.http.get<LookupRes[]>(`${this.backendUrl}/list/user-roles`);
  }
  getAllUserStatuses(): Observable<LookupRes[]> {
    return this.http.get<LookupRes[]>(`${this.backendUrl}/list/user-statuses`);
  }
}
