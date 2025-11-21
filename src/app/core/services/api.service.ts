import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  post<T = any>(url: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.log('POST:', fullUrl, body);
    return this.http.post<T>(fullUrl, body, { headers: this.getHeaders() });
  }

  get<T = any>(url: string): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    console.log('GET:', fullUrl);
    return this.http.get<T>(fullUrl, { headers: this.getHeaders() });
  }

  put<T = any>(url: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    return this.http.put<T>(fullUrl, body, { headers: this.getHeaders() });
  }

  delete<T = any>(url: string): Observable<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    return this.http.delete<T>(fullUrl, { headers: this.getHeaders() });
  }
}