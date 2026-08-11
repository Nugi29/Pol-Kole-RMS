import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getStats: () => of({
              totalTables: 20,
              occupiedTables: 0,
              availableTables: 20,
              cleaningTables: 0,
              activeReservationsToday: 0,
              ordersToday: 0,
              revenueToday: 0.0,
              pendingKitchenOrders: 0,
              lowStockInventoryAlerts: 0,
              monthlyRevenue: {}
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
