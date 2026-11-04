import { TestBed } from '@angular/core/testing';
import { CartaCocina } from './carta-cocina';

describe('CartaCocina', () => {
  let service: CartaCocina;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartaCocina);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
