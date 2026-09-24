import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { DishesPage } from './dishes.page';

describe('DishesPage', () => {
  let component: DishesPage;
  let fixture: ComponentFixture<DishesPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    });
    fixture = TestBed.createComponent(DishesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
