import { TestBed } from '@angular/core/testing';
import { Propina } from './propina';

describe('Propina', () => {
  let service: Propina;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Propina);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
