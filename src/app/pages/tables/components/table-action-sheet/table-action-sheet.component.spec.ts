import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { TableActionSheetComponent } from './table-action-sheet.component';

describe('TableActionSheetComponent', () => {
  let component: TableActionSheetComponent;
  let fixture: ComponentFixture<TableActionSheetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    });
    fixture = TestBed.createComponent(TableActionSheetComponent);
    component = fixture.componentInstance;
    component.table = { id: 'mesa-1', numero: 4, baja_logica: false };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
