import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MenuItem, MenuCategory, MenuService } from '../../../services/menu.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  categories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  displayedColumns = ['name', 'description', 'price', 'categoryName', 'preparationTime', 'availability', 'actions'];
  dataSource = new MatTableDataSource<MenuItem>([]);

  itemForm: FormGroup;
  catForm: FormGroup;
  editingItemId: number | null = null;
  editingCatId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'items';

  constructor(
    private readonly fb: FormBuilder,
    private readonly menuService: MenuService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      price: [10.00, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      preparationTime: [15, [Validators.required, Validators.min(1)]],
      isAvailable: [true]
    });

    this.catForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(250)]
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

  loadMenuItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.menuService.filterMenuItems(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.menuItems = data;
        this.dataSource.data = data;
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
  }

  deleteMenuItem(id: number): void {
    const item = this.menuItems.find(m => m.id === id);
    const itemLabel = item ? `"${item.name}"` : 'this menu item';
    this.dialogService.confirmDelete(itemLabel).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.menuService.deleteMenuItem(id).subscribe({
          next: () => {
            this.loadMenuItems();
            this.loading = false;
            this.dialogService.showSuccess('Deleted', `${itemLabel} deleted successfully.`);
          },
          error: () => {
            this.errorMessage = 'Failed to delete menu item.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', this.errorMessage);
          }
        });
      }
    });
  }

  requestClearItemForm(): void {
    if (this.itemForm.dirty || this.editingItemId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearItemForm();
          this.dialogService.showSuccess('Cleared', 'Menu item form cleared successfully.');
        }
      });
    } else {
      this.clearItemForm();
    }
  }

  clearItemForm(): void {
    this.editingItemId = null;
    this.itemForm.reset({
      name: '',
      description: '',
      price: 10.00,
      categoryId: '',
      preparationTime: 15,
      isAvailable: true
    });
  }

  // Categories
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
          this.dialogService.showSuccess('Category Registered', 'New category created successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create category.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
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

  deleteCategory(id: number): void {
    const cat = this.categories.find(c => c.id === id);
    const catLabel = cat ? `category "${cat.name}"` : 'this category';
    this.dialogService.confirmDelete(catLabel, `Are you sure you want to delete ${catLabel}?<br>All its associated menu items will be unlinked.`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.menuService.deleteCategory(id).subscribe({
          next: () => {
            this.loadCategories();
            this.loadMenuItems();
            this.loading = false;
            this.dialogService.showSuccess('Deleted', `${catLabel} deleted successfully.`);
          },
          error: () => {
            this.errorMessage = 'Failed to delete category.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', this.errorMessage);
          }
        });
      }
    });
  }

  requestClearCatForm(): void {
    if (this.catForm.dirty || this.editingCatId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearCatForm();
          this.dialogService.showSuccess('Cleared', 'Category form cleared successfully.');
        }
      });
    } else {
      this.clearCatForm();
    }
  }

  clearCatForm(): void {
    this.editingCatId = null;
    this.catForm.reset({
      name: '',
      description: ''
    });
  }
}
