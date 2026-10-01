import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableQrModalComponent } from './table-qr-modal.component';

describe('TableQrModalComponent', () => {
  let component: TableQrModalComponent;
  let fixture: ComponentFixture<TableQrModalComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TableQrModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
