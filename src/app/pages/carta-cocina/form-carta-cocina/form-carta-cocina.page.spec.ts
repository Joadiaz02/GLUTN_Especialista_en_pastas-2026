import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { FormCartaCocinaPage } from './form-carta-cocina.page';

describe('FormCartaCocinaPage', () => {
  let component: FormCartaCocinaPage;
  let fixture: ComponentFixture<FormCartaCocinaPage>;

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
    fixture = TestBed.createComponent(FormCartaCocinaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
