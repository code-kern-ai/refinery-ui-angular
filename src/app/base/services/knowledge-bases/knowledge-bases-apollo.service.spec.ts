import { TestBed } from '@angular/core/testing';

import { KnowledgeBasesApolloService } from './knowledge-bases-apollo.service';

describe('KnowledgeBasesApolloService', () => {
  let service: KnowledgeBasesApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KnowledgeBasesApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
