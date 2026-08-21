import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MenuItem, MenuCategory, MenuService } from '../../../services/menu.service';
import { DialogService } from '../../../services/dialog.service';
import { ItemDiscount, ItemDiscountService } from '../../../services/item-discount.service';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  @ViewChild('itemPaginator') itemPaginator!: MatPaginator;
  @ViewChild('discountPaginator') discountPaginator!: MatPaginator;

  categories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  itemDiscounts: ItemDiscount[] = [];

  displayedColumns = ['name', 'description', 'price', 'categoryName', 'preparationTime', 'availability', 'actions'];
  discountDisplayedColumns = ['title', 'menuItem', 'discount', 'dates', 'status', 'actions'];

  dataSource = new MatTableDataSource<MenuItem>([]);
  discountDataSource = new MatTableDataSource<ItemDiscount>([]);

  itemForm: FormGroup;
  catForm: FormGroup;
  discountForm: FormGroup;

  editingItemId: number | null = null;
  editingCatId: number | null = null;
  editingDiscountId: number | null = null;

  loading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'items'; // 'items' | 'categories' | 'discounts'

  constructor(
    private readonly fb: FormBuilder,
    private readonly menuService: MenuService,
    private readonly itemDiscountService: ItemDiscountService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      price: [1000.00, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      preparationTime: [15, [Validators.required, Validators.min(1)]],
      isAvailable: [true]
    });

    this.catForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(250)]
    });

    const today = new Date().toISOString().substring(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().substring(0, 10);

    this.discountForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      menuItemId: ['', Validators.required],
      discountType: ['SPECIAL_PRICE', Validators.required], // SPECIAL_PRICE, PERCENTAGE, FIXED_OFF
      discountValue: [800.00, [Validators.required, Validators.min(0.01)]],
      startDate: [today, Validators.required],
      endDate: [nextMonthStr, Validators.required],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadAll();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  loadAll(): void {
    this.loadCategories();
    this.loadMenuItems();
    this.loadItemDiscounts();
  }

  loadCategories(): void {
    this.menuService.getCategories().subscribe({
      next: (res) => {
        this.categories = res || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.categories = [];
        this.cdr.markForCheck();
      }
    });
  }

  // Filters for Catalog Items Directory
  itemSearchQuery = '';
  selectedCategoryId: number | null = null;
  selectedAvailability: boolean | null = null;

  loadMenuItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.menuService.filterMenuItems(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.menuItems = data;
        this.applyItemFilters();
        if (this.itemPaginator) {
          this.dataSource.paginator = this.itemPaginator;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load menu items', err);
        this.errorMessage = 'Failed to load menu items.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyItemFilters(): void {
    let filtered = [...this.menuItems];

    if (this.itemSearchQuery && this.itemSearchQuery.trim()) {
      const q = this.itemSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
        (item.price && String(item.price).includes(q))
      );
    }

    if (this.selectedCategoryId !== null && this.selectedCategoryId !== undefined) {
      filtered = filtered.filter(item => item.categoryId == this.selectedCategoryId);
    }

    if (this.selectedAvailability !== null && this.selectedAvailability !== undefined) {
      filtered = filtered.filter(item => Boolean(item.isAvailable) === Boolean(this.selectedAvailability));
    }

    this.dataSource.data = filtered;
    if (this.itemPaginator) {
      this.itemPaginator.firstPage();
    }
    this.cdr.markForCheck();
  }

  resetItemFilters(): void {
    this.itemSearchQuery = '';
    this.selectedCategoryId = null;
    this.selectedAvailability = null;
    this.dataSource.data = [...this.menuItems];
    if (this.itemPaginator) {
      this.itemPaginator.firstPage();
    }
    this.cdr.markForCheck();
  }

  loadItemDiscounts(): void {
    this.itemDiscountService.searchItemDiscounts(undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.itemDiscounts = data;
        this.discountDataSource.data = data;
        if (this.discountPaginator) {
          this.discountDataSource.paginator = this.discountPaginator;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to load item discounts', err);
        this.itemDiscounts = [];
      }
    });
  }

  // --- Menu Item CRUD ---
  saveMenuItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const payload = this.itemForm.value;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingItemId) {
      this.menuService.updateMenuItem(this.editingItemId, payload).subscribe({
        next: () => {
          this.loadMenuItems();
          this.clearItemForm();
          this.loading = false;
          this.dialogService.showSuccess('Item Updated', 'Menu item updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update menu item.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.menuService.createMenuItem(payload).subscribe({
        next: () => {
          this.loadMenuItems();
          this.clearItemForm();
          this.loading = false;
          this.dialogService.showSuccess('Item Registered', 'New menu item created successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create menu item.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
        }
      });
    }
  }

  editMenuItem(item: MenuItem): void {
    this.editingItemId = item.id || null;
    this.itemForm.patchValue({
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      preparationTime: item.preparationTime,
      isAvailable: item.isAvailable
    });
    this.cdr.markForCheck();
  }

  deleteMenuItem(item: MenuItem): void {
    this.dialogService.confirmDelete(item.name).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.menuService.deleteMenuItem(item.id!).subscribe({
          next: () => {
            this.loadMenuItems();
            this.loading = false;
            this.dialogService.showSuccess('Item Deleted', `"${item.name}" has been removed.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to delete menu item.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', this.errorMessage);
          }
        });
      }
    });
  }

  clearItemForm(): void {
    this.editingItemId = null;
    this.itemForm.reset({
      price: 1000.00,
      preparationTime: 15,
      isAvailable: true
    });
  }

  // --- Category CRUD ---
  saveCategory(): void {
    if (this.catForm.invalid) {
      this.catForm.markAllAsTouched();
      return;
    }

    const payload = this.catForm.value;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingCatId) {
      this.menuService.updateCategory(this.editingCatId, payload).subscribe({
        next: () => {
          this.loadCategories();
          this.clearCatForm();
          this.loading = false;
          this.dialogService.showSuccess('Category Updated', 'Category updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update category.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.menuService.createCategory(payload).subscribe({
        next: () => {
          this.loadCategories();
          this.clearCatForm();
          this.loading = false;
          this.dialogService.showSuccess('Category Created', 'Category created successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create category.';
          this.loading = false;
          this.dialogService.showError('Creation Failed', this.errorMessage);
        }
      });
    }
  }

  editCategory(cat: MenuCategory): void {
    this.editingCatId = cat.id || null;
    this.catForm.patchValue({
      name: cat.name,
      description: cat.description
    });
  }

  deleteCategory(cat: MenuCategory): void {
    this.dialogService.confirmDelete(cat.name).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.menuService.deleteCategory(cat.id!).subscribe({
          next: () => {
            this.loadCategories();
            this.loading = false;
            this.dialogService.showSuccess('Category Deleted', `"${cat.name}" has been deleted.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to delete category.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', this.errorMessage);
          }
        });
      }
    });
  }

  clearCatForm(): void {
    this.editingCatId = null;
    this.catForm.reset();
  }

  // --- Special Time-Period Item Discount CRUD ---
  saveItemDiscount(): void {
    if (this.discountForm.invalid) {
      this.discountForm.markAllAsTouched();
      return;
    }

    const payload: ItemDiscount = this.discountForm.value;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingDiscountId) {
      this.itemDiscountService.updateItemDiscount(this.editingDiscountId, payload).subscribe({
        next: (saved) => {
          this.loadItemDiscounts();
          this.clearDiscountForm();
          this.loading = false;
          this.dialogService.showSuccess('Discount Updated', `Promotional discount for ${saved.menuItemName} updated.`);
        },
        error: (err) => {
          this.loading = false;
          this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update item discount.');
        }
      });
    } else {
      this.itemDiscountService.createItemDiscount(payload).subscribe({
        next: (created) => {
          this.loadItemDiscounts();
          this.clearDiscountForm();
          this.loading = false;
          this.dialogService.showSuccess('Discount Created', `Special promotional price configured for ${created.menuItemName}.`);
        },
        error: (err) => {
          this.loading = false;
          this.dialogService.showError('Creation Failed', err.error?.message || 'Failed to create item discount.');
        }
      });
    }
  }

  editItemDiscount(d: ItemDiscount): void {
    this.editingDiscountId = d.id || null;
    this.discountForm.patchValue({
      title: d.title,
      menuItemId: d.menuItemId,
      discountType: d.discountType,
      discountValue: d.discountValue,
      startDate: d.startDate,
      endDate: d.endDate,
      isActive: d.isActive !== undefined ? d.isActive : true
    });
    this.cdr.markForCheck();
  }

  deleteItemDiscount(d: ItemDiscount): void {
    this.dialogService.confirmDelete(d.title, `Are you sure you want to remove special discount <strong>"${d.title}"</strong> for ${d.menuItemName}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.itemDiscountService.deleteItemDiscount(d.id!).subscribe({
          next: () => {
            this.loadItemDiscounts();
            this.loading = false;
            this.dialogService.showSuccess('Discount Removed', `Special discount removed.`);
          },
          error: (err) => {
            this.loading = false;
            this.dialogService.showError('Delete Failed', err.error?.message || 'Failed to delete item discount.');
          }
        });
      }
    });
  }

  toggleItemDiscountStatus(d: ItemDiscount): void {
    this.itemDiscountService.toggleActiveStatus(d.id!).subscribe({
      next: (updated) => {
        d.isActive = updated.isActive;
        d.status = updated.status;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.dialogService.showError('Status Error', err.error?.message || 'Failed to toggle status.');
      }
    });
  }

  clearDiscountForm(): void {
    this.editingDiscountId = null;
    const today = new Date().toISOString().substring(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().substring(0, 10);

    this.discountForm.reset({
      title: '',
      menuItemId: '',
      discountType: 'SPECIAL_PRICE',
      discountValue: 800.00,
      startDate: today,
      endDate: nextMonthStr,
      isActive: true
    });
  }

  getLiveDiscountPreview(): { original: number, discounted: number } {
    const itemId = this.discountForm.get('menuItemId')?.value;
    const type = this.discountForm.get('discountType')?.value;
    const val = Number(this.discountForm.get('discountValue')?.value) || 0;

    const item = this.menuItems.find(m => m.id === Number(itemId));
    const original = item?.price || 0;
    let discounted = original;

    if (type === 'PERCENTAGE') {
      discounted = original - (original * val / 100);
    } else if (type === 'FIXED_OFF') {
      discounted = original - val;
    } else if (type === 'SPECIAL_PRICE') {
      discounted = val;
    }

    if (discounted < 0) discounted = 0;
    return { original, discounted };
  }
}
