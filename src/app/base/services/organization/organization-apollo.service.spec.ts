import { TestBed } from '@angular/core/testing';

import { OrganizationApolloService } from './organization-apollo.service';

describe('OrganizationApolloService', () => {
  let service: OrganizationApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrganizationApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
