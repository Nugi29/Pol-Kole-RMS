import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AiChatRequest {
  message: string;
  conversationId?: string;
}

export interface AiChatResponse {
  message: string;
  type: 'ANSWER' | 'REPORT' | 'PDF' | 'ERROR';
  reportUrl?: string;
  conversationId: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class AiReportService {
  private readonly baseUrl = `${environment.apiUrl}/ai/reports`;
  private currentConversationId: string = '';

  constructor(private readonly http: HttpClient) {
    this.currentConversationId = 'conv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }

  getConversationId(): string {
    return this.currentConversationId;
  }

  resetConversation(): void {
    this.currentConversationId = 'conv_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }

  sendMessage(message: string): Observable<ApiResponse<AiChatResponse>> {
    const payload: AiChatRequest = {
      message,
      conversationId: this.currentConversationId,
    };
    return this.http.post<ApiResponse<AiChatResponse>>(`${this.baseUrl}/chat`, payload);
  }

  downloadAiReportPdf(startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get(`${this.baseUrl}/pdf`, {
      params,
      responseType: 'blob',
    });
  }
}
