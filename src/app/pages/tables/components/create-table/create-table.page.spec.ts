import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { CreateTablePage } from './create-table.page';

describe('CreateTablePage', () => {
  let component: CreateTablePage;
  let fixture: ComponentFixture<CreateTablePage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(CreateTablePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
