import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  logoutUrl = environment.auth_api_new + 'logout/browser';

  constructor(private httpClient: HttpClient) {}

  public getLogoutOut() {
    return this.httpClient.get(this.logoutUrl);
  }
}
