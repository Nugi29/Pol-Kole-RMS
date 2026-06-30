import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { InventoryItem, StockTransaction, InventoryService } from '../../../services/inventory.service';

@Component({
  selector: 'app-inventory',
  standalone: false,
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  inventory: InventoryItem[] = [];
  displayedColumns = ['itemName', 'quantity', 'supplier', 'warningThreshold', 'actions'];
  dataSource = new MatTableDataSource<InventoryItem>([]);

  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'stock';

  // Stock update modals
  selectedItem: InventoryItem | null = null;
  updateQtyVal: number = 5;
  updateReason: string = 'Monthly restock';

  constructor(
    private readonly fb: FormBuilder,
    private readonly inventoryService: InventoryService,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      itemName: ['', [Validators.required, Validators.maxLength(100)]],
      quantity: [10, [Validators.required, Validators.min(0)]],
      supplier: ['', [Validators.required, Validators.maxLength(100)]],
      warningThreshold: [5, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadInventory();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadInventory(): void {
    this.loading = true;
    this.inventoryService.filterInventory().subscribe({
      next: (page) => {
        this.inventory = page.content;
        this.dataSource.data = page.content;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load inventory supplies.';
        this.loading = false;
      }
    });
  }

  saveItem(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    payload.stockLevel = payload.quantity; // set stockLevel equal to qty

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingId) {
      this.inventoryService.updateItem(this.editingId, payload).subscribe({
        next: () => {
          this.successMessage = 'Inventory item details updated successfully.';
          this.loadInventory();
          this.clearForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update item.';
          this.loading = false;
        }
      });
    } else {
      this.inventoryService.createItem(payload).subscribe({
        next: () => {
          this.successMessage = 'Inventory item created successfully.';
          this.loadInventory();
          this.clearForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create item.';
          this.loading = false;
        }
      });
    }
  }

  editItem(item: InventoryItem): void {
    this.editingId = item.id || null;
    this.form.patchValue({
      itemName: item.itemName,
      quantity: item.quantity,
      supplier: item.supplier,
      warningThreshold: item.warningThreshold
    });
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      this.loading = true;
      this.inventoryService.deleteItem(id).subscribe({
        next: () => {
          this.successMessage = 'Inventory item deleted successfully.';
          this.loadInventory();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to delete inventory item.';
          this.loading = false;
        }
      });
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.form.reset({
      itemName: '',
      quantity: 10,
      supplier: '',
      warningThreshold: 5
    });
  }

  // Adjustments
  selectItemForAdjustment(item: InventoryItem): void {
    this.selectedItem = item;
    this.updateQtyVal = 5;
    this.updateReason = 'Restock ingredient supplies';
  }

  adjustStock(type: 'restock' | 'deduct'): void {
    if (!this.selectedItem) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const req = type === 'restock'
      ? this.inventoryService.restockItem(this.selectedItem.id!, this.updateQtyVal, this.updateReason)
      : this.inventoryService.deductItem(this.selectedItem.id!, this.updateQtyVal, this.updateReason);

    req.subscribe({
      next: () => {
        this.successMessage = `Stock transaction completed successfully.`;
        this.loadInventory();
        this.selectedItem = null;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to complete transaction.';
        this.loading = false;
      }
    });
  }
}
