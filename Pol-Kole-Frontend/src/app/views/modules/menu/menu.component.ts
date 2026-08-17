import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MenuItem, MenuCategory, MenuService } from '../../../services/menu.service';

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
    private readonly cdr: ChangeDetectorRef
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
          this.successMessage = 'Menu item updated successfully.';
          this.loadMenuItems();
          this.clearItemForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update menu item.';
          this.loading = false;
        }
      });
    } else {
      this.menuService.createMenuItem(payload).subscribe({
        next: () => {
          this.successMessage = 'Menu item created successfully.';
          this.loadMenuItems();
          this.clearItemForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create menu item.';
          this.loading = false;
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
    if (confirm('Are you sure you want to delete this menu item?')) {
      this.loading = true;
      this.menuService.deleteMenuItem(id).subscribe({
        next: () => {
          this.successMessage = 'Menu item deleted successfully.';
          this.loadMenuItems();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to delete menu item.';
          this.loading = false;
        }
      });
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
          this.successMessage = 'Category updated successfully.';
          this.loadCategories();
          this.clearCatForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update category.';
          this.loading = false;
        }
      });
    } else {
      this.menuService.createCategory(payload).subscribe({
        next: () => {
          this.successMessage = 'Category created successfully.';
          this.loadCategories();
          this.clearCatForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create category.';
          this.loading = false;
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
    if (confirm('Are you sure you want to delete this category? All its items will be unlinked.')) {
      this.loading = true;
      this.menuService.deleteCategory(id).subscribe({
        next: () => {
          this.successMessage = 'Category deleted successfully.';
          this.loadCategories();
          this.loadMenuItems();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to delete category.';
          this.loading = false;
        }
      });
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
