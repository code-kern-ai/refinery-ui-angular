import { TestBed } from '@angular/core/testing';

import { ExceptionInterceptor } from './exception.interceptor';

describe('ExceptionInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      ExceptionInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: ExceptionInterceptor = TestBed.inject(ExceptionInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
