import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, pipe, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private token: string | null = null;

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

  private loadUserFromStorage() {
    this.token = this.getToken();
  }

 login(email: string, password: string): Observable<any> {
  return this.http
    .post<any>('http://localhost:3000/api/auth/login', { email, password })
    .pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.user.role);
      })
    );
}


  saveToken(token: string) {
    this.token = token;
    if (this.isBrowser()) {
      localStorage.setItem('token', token);
    }
  }

  logout() {
    this.token = null;
    if (this.isBrowser()) {
      localStorage.removeItem('token');
    }
  }

  getTokenValue(): string | null {
    return this.token;
  }
 private apiUrl = 'http://localhost:3000/api/User';
  private apiUr = 'http://localhost:3000/api';
  // ===================== GET USERS =====================
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  // ===================== GET ROLES =====================
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`);
  }

  // ===================== ADD USER =====================
  addUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUr}/auth/create`, user);
  }

  // ===================== UPDATE USER =====================
  updateUser(id: number, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${id}`, user);
  }

  // ===================== DELETE USER =====================
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/${id}`);
  }
}
