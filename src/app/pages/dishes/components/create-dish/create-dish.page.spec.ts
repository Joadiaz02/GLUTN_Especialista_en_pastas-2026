import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateDishPage } from './create-dish.page';

describe('CreateDishPage', () => {
  let component: CreateDishPage;
  let fixture: ComponentFixture<CreateDishPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateDishPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
