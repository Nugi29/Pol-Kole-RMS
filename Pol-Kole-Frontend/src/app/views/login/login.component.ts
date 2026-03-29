import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginPayload, LoginResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  readonly state = 'User';
  email = '';
  password = '';
  isSubmitting = false;
  public errorMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

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

        if (!token) {
          this.errorMessage = 'Invalid login response.';
          console.log(this.errorMessage);
          console.log(res);
          this.isSubmitting = false;
          return;
        }

        localStorage.setItem('token', token);
        if (role) {
          localStorage.setItem('role', role);
        }

        this.redirectToMainWindow();
      },
      error: () => {
        this.errorMessage = 'Login failed. Please check your credentials.';
        console.log(this.errorMessage);
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
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

  private redirectToMainWindow() {
    this.router.navigate(['/main', 'dashboard']).catch(() => {
      this.router.navigate(['/']);
    });
  }
}
