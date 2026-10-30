import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { TableQrModalComponent } from './table-qr-modal.component';

describe('TableQrModalComponent', () => {
  let component: TableQrModalComponent;
  let fixture: ComponentFixture<TableQrModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    });
    fixture = TestBed.createComponent(TableQrModalComponent);
    component = fixture.componentInstance;
    component.table = { id: 'mesa-1', numero: 4 };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
