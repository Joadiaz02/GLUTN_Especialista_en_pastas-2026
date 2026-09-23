import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { DrinksPage } from './drinks.page';

describe('DrinksPage', () => {
  let component: DrinksPage;
  let fixture: ComponentFixture<DrinksPage>;

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
    fixture = TestBed.createComponent(DrinksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
