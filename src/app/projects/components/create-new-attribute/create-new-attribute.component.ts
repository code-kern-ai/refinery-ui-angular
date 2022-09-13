import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'kern-create-new-attribute',
  templateUrl: './create-new-attribute.component.html',
  styleUrls: ['./create-new-attribute.component.scss']
})
export class CreateNewAttributeComponent implements OnInit {

  project: any;
  attribute$: any;

  constructor( 
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.projectApolloService.getProjectById(projectId).pipe(first()).subscribe(project => this.project = project);
  }

}
