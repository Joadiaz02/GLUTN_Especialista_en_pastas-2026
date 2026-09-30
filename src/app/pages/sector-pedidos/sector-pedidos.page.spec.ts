import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectorPedidosPage } from './sector-pedidos.page';

describe('SectorPedidosPage', () => {
  let component: SectorPedidosPage;
  let fixture: ComponentFixture<SectorPedidosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SectorPedidosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
