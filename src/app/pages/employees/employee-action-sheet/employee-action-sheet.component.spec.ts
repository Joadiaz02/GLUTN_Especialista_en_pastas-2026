import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { EmployeeActionSheetComponent } from './employee-action-sheet.component';

describe('EmployeeActionSheetComponent', () => {
  let component: EmployeeActionSheetComponent;
  let fixture: ComponentFixture<EmployeeActionSheetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    });
    fixture = TestBed.createComponent(EmployeeActionSheetComponent);
    component = fixture.componentInstance;
    component.employee = { id: 'empleado-1', nombre: 'Ana', apellido: 'Gómez', perfil: 'mozo', avatar: null };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
