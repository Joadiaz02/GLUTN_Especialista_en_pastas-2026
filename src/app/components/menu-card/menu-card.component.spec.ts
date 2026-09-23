import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { MenuCardComponent } from './menu-card.component';

describe('MenuCardComponent', () => {
  let component: MenuCardComponent;
  let fixture: ComponentFixture<MenuCardComponent>;

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
    fixture = TestBed.createComponent(MenuCardComponent);
    fixture.componentRef.setInput('menu', {
      nombre: 'Sorrentinos de jamón y queso',
      descripcion: 'Con salsa a elección',
      precio: 5200,
      foto_1: '',
      sugerencia: false,
      baja_logica: false,
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
