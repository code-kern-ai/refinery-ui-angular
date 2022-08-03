import { ErrorHandler, Injectable } from '@angular/core';
import { DemoError } from './DemoError';
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor() { }

  handleError(error: any) {
    if (error instanceof DemoError) {
      alert(error.errorMessage());
    } else {
      console.error(error);
    }
  }
}