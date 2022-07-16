import { TestBed } from '@angular/core/testing';

import { WeakSourceApolloService } from './weak-source-apollo.service';

describe('WeakSourceApolloService', () => {
  let service: WeakSourceApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeakSourceApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
