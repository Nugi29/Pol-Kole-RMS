import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginPayload, LoginResponse } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  readonly state = 'User';
  readonly loginBgImageUrl = environment.loginBgImageUrl;
  email = '';
  password = '';
  isSubmitting = false;
  isCheckingSession = false;
  hidePassword = true;
  public errorMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      this.isCheckingSession = true;
      this.redirectToMainWindow();
    }
  }

  onSubmit() {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Email and password are required.';
      console.log(this.errorMessage);
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';
    const body: LoginPayload = {
      email: this.email,
      password: this.password,
    };
    this.auth.login(body).subscribe({
      next: (res: LoginResponse) => {
        const token = this.getTokenFromResponse(res);
        const role = this.getRoleFromResponse(res);
        const name = this.getNameFromResponse(res) || this.getNameFromEmail(this.email);
        const userId = this.getUserIdFromResponse(res);
        if (!token) {
          this.errorMessage = 'Invalid login response.';
          console.log(this.errorMessage);
          console.log(res);
          this.isSubmitting = false;
          return;
        }
        localStorage.setItem('token', token);
        localStorage.setItem('email', this.email.trim());
        if (userId) {
          localStorage.setItem('userId', String(userId));
        }
        if (role) {
          localStorage.setItem('role', role);
        }
        if (name) {
          localStorage.setItem('name', name);
        }
        this.redirectToMainWindow();
      },
      error: (err) => {
        this.errorMessage = 'Login failed. Please check your credentials.';
        console.log(this.errorMessage);
        this.isSubmitting = false;
      }
    });
  }

  private getTokenFromResponse(res: LoginResponse): string {
    const candidate = res as unknown as {
      token?: string;
      data?: { token?: string };
      result?: { token?: string };
    };
    return candidate.token ?? candidate.data?.token ?? candidate.result?.token ?? '';
  }

  private getRoleFromResponse(res: LoginResponse): string {
    const candidate = res as unknown as {
      role?: string;
      data?: { role?: string };
      result?: { role?: string };
    };
    return candidate.role ?? candidate.data?.role ?? candidate.result?.role ?? '';
  }

  private getNameFromResponse(res: LoginResponse): string {
    const candidate = res as unknown as {
      name?: string;
      data?: { name?: string };
      result?: { name?: string };
    };
    return candidate.name ?? candidate.data?.name ?? candidate.result?.name ?? '';
  }

  private getUserIdFromResponse(res: LoginResponse): number | null {
    const candidate = res as unknown as {
      userId?: number;
      id?: number;
      data?: { userId?: number; id?: number };
      result?: { userId?: number; id?: number };
    };
    return candidate.userId ?? candidate.id ?? candidate.data?.userId ?? candidate.data?.id ?? candidate.result?.userId ?? candidate.result?.id ?? null;
  }

  private getNameFromEmail(email: string): string {
    const emailPrefix = email.trim().split('@')[0] ?? '';
    return emailPrefix.trim();
  }

  private redirectToMainWindow() {
    const role = (localStorage.getItem('role') || '').replace(/^ROLE_/i, '').toUpperCase();
    const target = role === 'DISPLAY' ? ['/main', 'displays'] : ['/main', 'dashboard'];

    this.router.navigate(target).then(
      (success) => {
        if (!success) {
          this.handleRedirectFailure();
        }
      },
      () => {
        this.handleRedirectFailure();
      }
    );
  }

  private handleRedirectFailure() {
    localStorage.clear();
    this.isSubmitting = false;
    this.isCheckingSession = false;
    this.errorMessage = 'Authentication and redirection failed. Please sign in again.';
  }
}
