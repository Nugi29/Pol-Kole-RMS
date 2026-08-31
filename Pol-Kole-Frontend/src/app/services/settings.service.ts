import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RestaurantSettings {
  id?: number;
  restaurantFullName: string;
  restaurantShortName: string;
  tagline?: string;
  slogan?: string;
  phoneNumber?: string;
  hotlinePhoneNumber?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  website?: string;
  currency?: string;
  taxPercentage?: number;
  serviceChargePercentage?: number;
  logoUrl?: string;
  invoiceFooter?: string;
  termsConditions?: string;
  updatedAt?: string;
  developerKey?: string;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantFullName: 'Pol-Kole',
  restaurantShortName: 'Pol-Kole',
  tagline: 'Dine • Stay • Enjoy',
  slogan: 'Feels Like Home',
  phoneNumber: '+94 91 228 3456',
  hotlinePhoneNumber: '+94 77 123 4567',
  email: 'info@polkole.lk',
  address: 'Galle Road, Ahangama, Southern Province, Sri Lanka',
  taxNumber: 'PV-98234-LK',
  website: 'www.polkole.lk',
  currency: 'LKR',
  taxPercentage: 0,
  serviceChargePercentage: 10,
  logoUrl: '',
  invoiceFooter: 'Thank you for dining at Pol-Kole. See you again soon!',
  termsConditions: 'All charges include 10% statutory hospitality service charge. Goods & Services are non-refundable once billed.',
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly apiUrl = `${environment.apiUrl}/settings`;

  // Centralized reactive state using Angular Signals
  readonly settings = signal<RestaurantSettings>(DEFAULT_SETTINGS);
  readonly loaded = signal<boolean>(false);
  readonly loading = signal<boolean>(false);

  // Convenient computed signals for components to consume reactively
  readonly restaurantFullName = computed(() => this.settings().restaurantFullName || 'Pol-Kole');
  readonly restaurantShortName = computed(() => this.settings().restaurantShortName || 'Pol-Kole');
  readonly tagline = computed(() => this.settings().tagline || 'Dine • Stay • Enjoy');
  readonly slogan = computed(() => this.settings().slogan || 'Feels Like Home');
  readonly phoneNumber = computed(() => this.settings().phoneNumber || '+94 91 228 3456');
  readonly hotlinePhoneNumber = computed(() => this.settings().hotlinePhoneNumber || '+94 77 123 4567');
  readonly email = computed(() => this.settings().email || 'info@polkole.lk');
  readonly address = computed(() => this.settings().address || 'Galle Road, Ahangama, Southern Province, Sri Lanka');
  readonly taxNumber = computed(() => this.settings().taxNumber || 'PV-98234-LK');
  readonly website = computed(() => this.settings().website || 'www.polkole.lk');
  readonly currency = computed(() => this.settings().currency || 'LKR');
  readonly taxPercentage = computed(() => this.settings().taxPercentage ?? 0);
  readonly serviceChargePercentage = computed(() => this.settings().serviceChargePercentage ?? 10);
  readonly invoiceFooter = computed(() => this.settings().invoiceFooter || 'Thank you for dining at Pol-Kole. See you again soon!');
  readonly termsConditions = computed(() => this.settings().termsConditions || 'All charges include 10% statutory hospitality service charge. Goods & Services are non-refundable once billed.');
  readonly logoUrl = computed(() => this.settings().logoUrl || '');

  private pendingRequest$: Observable<RestaurantSettings> | null = null;
  private static readonly STORAGE_KEY = 'polkole_restaurant_settings';

  constructor(private readonly http: HttpClient) {
    this.hydrateFromStorage();
    this.loadSettings(true).subscribe();
  }

  private hydrateFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = localStorage.getItem(SettingsService.STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            this.settings.set({ ...DEFAULT_SETTINGS, ...parsed });
            this.loaded.set(true);
          }
        }
      } catch (e) {
        console.warn('Could not parse cached restaurant settings from localStorage', e);
      }
    }
  }

  private saveToStorage(data: RestaurantSettings): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(SettingsService.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Could not save restaurant settings to localStorage', e);
      }
    }
  }

  /**
   * Loads settings from GET /api/settings.
   * Cached to prevent repeated network calls across multiple components.
   */
  loadSettings(forceReload: boolean = false): Observable<RestaurantSettings> {
    if (!forceReload && this.loaded()) {
      return of(this.settings());
    }

    if (this.pendingRequest$ && !forceReload) {
      return this.pendingRequest$;
    }

    this.loading.set(true);

    this.pendingRequest$ = this.http.get<RestaurantSettings>(this.apiUrl).pipe(
      tap((data) => {
        if (data) {
          const merged = { ...DEFAULT_SETTINGS, ...data };
          this.settings.set(merged);
          this.loaded.set(true);
          this.saveToStorage(merged);
        }
        this.loading.set(false);
        this.pendingRequest$ = null;
      }),
      catchError((err) => {
        console.warn('Could not load restaurant settings from API, using defaults/cached:', err);
        this.loading.set(false);
        this.pendingRequest$ = null;
        return of(this.settings());
      }),
      shareReplay(1)
    );

    return this.pendingRequest$;
  }

  /**
   * Updates restaurant settings via PUT /api/settings.
   * Requires developer key for authorization.
   */
  updateSettings(data: RestaurantSettings, developerKey: string): Observable<RestaurantSettings> {
    const payload: RestaurantSettings = {
      ...data,
      developerKey,
    };

    return this.http.put<RestaurantSettings>(this.apiUrl, payload).pipe(
      tap((updated) => {
        const merged = { ...DEFAULT_SETTINGS, ...updated };
        this.settings.set(merged);
        this.loaded.set(true);
        this.saveToStorage(merged);
      })
    );
  }
}
