import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateTablePage } from './create-table.page';

describe('CreateTablePage', () => {
  let component: CreateTablePage;
  let fixture: ComponentFixture<CreateTablePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateTablePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
