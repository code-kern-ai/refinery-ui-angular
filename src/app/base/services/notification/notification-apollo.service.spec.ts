import { TestBed } from '@angular/core/testing';

import { NotificationApolloService } from './notification-apollo.service';

describe('NotificationApolloService', () => {
  let service: NotificationApolloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationApolloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
