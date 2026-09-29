import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnRingComponent } from './turn-ring.component';

describe('TurnRingComponent', () => {
  let component: TurnRingComponent;
  let fixture: ComponentFixture<TurnRingComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TurnRingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
