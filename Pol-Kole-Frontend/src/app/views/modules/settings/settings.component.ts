import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SettingsService, RestaurantSettings } from '../../../services/settings.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  activeTab: 'info' | 'billing' | 'invoice' | 'preview' = 'info';

  // Developer Key Authorization
  showDevKeyModal = false;
  devKeyInput = '';
  devKeyError = '';
  developerKey = '';
  isDevAuthorized = false;

  constructor(
    private readonly fb: FormBuilder,
    public readonly settingsService: SettingsService,
    private readonly dialogService: DialogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCurrentSettings();
  }

  initForm(): void {
    const s = this.settingsService.settings();
    this.settingsForm = this.fb.group({
      restaurantFullName: [s.restaurantFullName || 'Pol-Kole', [Validators.required, Validators.maxLength(150)]],
      restaurantShortName: [s.restaurantShortName || 'Pol-Kole', [Validators.required, Validators.maxLength(50)]],
      tagline: [s.tagline || 'Dine • Stay • Enjoy', [Validators.maxLength(150)]],
      slogan: [s.slogan || 'Feels Like Home', [Validators.maxLength(150)]],
      phoneNumber: [s.phoneNumber || '+94 91 228 3456', [Validators.maxLength(30)]],
      hotlinePhoneNumber: [s.hotlinePhoneNumber || '+94 77 123 4567', [Validators.maxLength(30)]],
      email: [s.email || 'info@polkole.lk', [Validators.email, Validators.maxLength(100)]],
      address: [s.address || 'Galle Road, Ahangama, Southern Province, Sri Lanka', [Validators.maxLength(255)]],
      taxNumber: [s.taxNumber || 'PV-98234-LK', [Validators.maxLength(50)]],
      website: [s.website || 'www.polkole.lk', [Validators.maxLength(100)]],
      currency: [s.currency || 'LKR', [Validators.required, Validators.maxLength(15)]],
      taxPercentage: [s.taxPercentage ?? 0, [Validators.min(0), Validators.max(100)]],
      serviceChargePercentage: [s.serviceChargePercentage ?? 10, [Validators.min(0), Validators.max(100)]],
      logoUrl: [s.logoUrl || '', [Validators.maxLength(500)]],
      invoiceFooter: [s.invoiceFooter || 'Thank you for dining at Pol-Kole. See you again soon!', [Validators.maxLength(500)]],
      termsConditions: [s.termsConditions || 'All charges include 10% statutory hospitality service charge. Goods & Services are non-refundable once billed.', [Validators.maxLength(1000)]],
    });
  }

  loadCurrentSettings(): void {
    this.loading = true;
    this.settingsService.loadSettings(true).subscribe({
      next: (s) => {
        if (s) {
          this.settingsForm.patchValue({
            restaurantFullName: s.restaurantFullName,
            restaurantShortName: s.restaurantShortName,
            tagline: s.tagline,
            slogan: s.slogan,
            phoneNumber: s.phoneNumber,
            hotlinePhoneNumber: s.hotlinePhoneNumber,
            email: s.email,
            address: s.address,
            taxNumber: s.taxNumber,
            website: s.website,
            currency: s.currency,
            taxPercentage: s.taxPercentage ?? 0,
            serviceChargePercentage: s.serviceChargePercentage ?? 10,
            logoUrl: s.logoUrl,
            invoiceFooter: s.invoiceFooter,
            termsConditions: s.termsConditions,
          });
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openSaveDialog(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.dialogService.showError('Validation Error', 'Please complete all required fields correctly before saving.');
      return;
    }

    this.devKeyError = '';
    this.showDevKeyModal = true;
  }

  cancelDevKeyModal(): void {
    this.showDevKeyModal = false;
    this.devKeyInput = '';
    this.devKeyError = '';
  }

  confirmSaveWithDevKey(): void {
    if (!this.devKeyInput || !this.devKeyInput.trim()) {
      this.devKeyError = 'Developer key is required to save changes.';
      return;
    }

    const enteredKey = this.devKeyInput.trim();
    this.saving = true;
    this.devKeyError = '';

    const payload: RestaurantSettings = {
      ...this.settingsForm.value,
    };

    this.settingsService.updateSettings(payload, enteredKey).subscribe({
      next: (res) => {
        this.saving = false;
        this.showDevKeyModal = false;
        this.isDevAuthorized = true;
        this.developerKey = enteredKey;
        this.devKeyInput = '';
        this.dialogService.showSuccess(
          'Settings Saved Successfully',
          'Restaurant details and configuration have been updated across the RMS in real time.'
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 403) {
          this.devKeyError = 'Invalid developer key. Access denied.';
        } else {
          this.devKeyError = 'Error saving settings: ' + (err.error?.message || err.message || 'Server error');
        }
        this.cdr.markForCheck();
      },
    });
  }

  resetToSaved(): void {
    this.loadCurrentSettings();
    this.dialogService.showSuccess('Reset Done', 'Form values reset to current system settings.');
  }

  get formVals(): any {
    return this.settingsForm.value;
  }
}
