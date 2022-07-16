import { TestBed } from '@angular/core/testing';

import { RecordApolloService } from './record-apollo.service';

describe('RecordApolloService', () => {
  let service: RecordApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
