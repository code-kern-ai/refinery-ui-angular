import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';

@Component({
  selector: 'kern-project-metadata',
  templateUrl: './project-metadata.component.html',
  styleUrls: ['./project-metadata.component.scss']
})
export class ProjectMetadataComponent {

  @Input() project: Project;
  projectName = new FormControl('');

  constructor(private projectApolloService: ProjectApolloService, private router: Router) { }

  updateProjectNameAndDescription(newName: string, newDescription: string) {
    if (newName == '' && newDescription == '') return;
    if (newName == '') {
      newName = this.project.name;
    }
    if (newDescription == '') {
      newDescription = this.project.description;
    }
    this.projectApolloService
      .updateProjectNameAndDescription(this.project.id, newName.trim(), newDescription.trim())
      .pipe(first()).subscribe();
  }


  deleteProject() {
    this.projectApolloService
      .deleteProjectById(this.project.id)
      .pipe(first()).subscribe();

    this.router.navigate(['projects']);
  }

}
