import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditTablePage } from './edit-table.page';

describe('EditTablePage', () => {
  let component: EditTablePage;
  let fixture: ComponentFixture<EditTablePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditTablePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
