import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { CartaCocinaPage } from './carta-cocina.page';

describe('CartaCocinaPage', () => {
  let component: CartaCocinaPage;
  let fixture: ComponentFixture<CartaCocinaPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { tipo: 'plato' }, paramMap: { get: () => null } } },
        },
      ],
    });
    fixture = TestBed.createComponent(CartaCocinaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
