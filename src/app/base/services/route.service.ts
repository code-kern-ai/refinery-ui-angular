import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  private activatedRouteState = new BehaviorSubject<ActivatedRoute>(
    new ActivatedRoute()
  );

  readOnlyActivatedRouteState$: Observable<ActivatedRoute>;

  constructor() {
    this.readOnlyActivatedRouteState$ = this.activatedRouteState.asObservable();
  }

  updateActivatedRoute(activatedRoute: ActivatedRoute) {
    this.activatedRouteState.next(activatedRoute);
  }

  getActivatedRoute(): Observable<ActivatedRoute> {
    return this.readOnlyActivatedRouteState$;
  }
}
