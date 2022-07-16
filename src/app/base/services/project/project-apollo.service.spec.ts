import { TestBed } from '@angular/core/testing';

import { ProjectApolloService } from './project-apollo.service';

describe('ProjectApolloService', () => {
  let service: ProjectApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
