import { TestBed } from '@angular/core/testing';
import { Waitlist } from './waitlist';

describe('Waitlist', () => {
  let service: Waitlist;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Waitlist);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
