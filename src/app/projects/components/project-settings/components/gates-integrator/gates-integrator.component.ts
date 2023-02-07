import { Component, OnInit, Input } from '@angular/core';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Project } from 'src/app/base/entities/project';
import { first } from 'rxjs/operators';

@Component({
  selector: 'kern-gates-integrator',
  templateUrl: './gates-integrator.component.html',
  styleUrls: ['./gates-integrator.component.scss']
})
export class GatesIntegratorComponent implements OnInit {

  @Input() project: Project;

  constructor(private projectApolloService: ProjectApolloService) { }

  isGatesReady: boolean = false;

  ngOnInit(): void {
    this.setGatesReady();
  }

  setGatesReady() {
    this.projectApolloService.isGatesReady(this.project.id).pipe(first())
    .subscribe((isGatesReady) => {
      this.isGatesReady = isGatesReady;});
  }

  updateProjectForGates() {
    this.projectApolloService.updateProjectForGates(this.project.id).pipe(first())
    .subscribe(() => {
      this.setGatesReady();
    });
  }
}
