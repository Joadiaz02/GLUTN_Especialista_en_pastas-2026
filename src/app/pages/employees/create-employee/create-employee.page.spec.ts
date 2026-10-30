import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { CreateEmployeePage } from './create-employee.page';

describe('CreateEmployeePage', () => {
  let component: CreateEmployeePage;
  let fixture: ComponentFixture<CreateEmployeePage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    });
    fixture = TestBed.createComponent(CreateEmployeePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
