import { TestBed } from '@angular/core/testing';

import { ConfigApolloService } from './config-apollo.service';

describe('ConfigApolloService', () => {
  let service: ConfigApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
