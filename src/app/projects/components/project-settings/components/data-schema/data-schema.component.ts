import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { attributeVisibilityStates, getTooltipVisibilityState } from '../../../create-new-attribute/attributes-visibility-helper';
import { Attribute } from '../../entities/attribute.type';


@Component({
  selector: 'kern-data-schema',
  templateUrl: './data-schema.component.html',
  styleUrls: ['./data-schema.component.scss']
})
export class DataSchemaComponent implements OnInit, OnChanges {

  @Input() project: Project;
  @Input() attributes: Attribute[];
  @Input() pKeyValid: boolean;
  @Input() isAcOrTokenizationRunning: boolean

  tooltipsArray: string[];
  attributeVisibilityStates = attributeVisibilityStates;
  somethingLoading: boolean = false;

  constructor(private projectApolloService: ProjectApolloService) { }

  ngOnInit() {
    this.tooltipsArray = [];
    this.attributeVisibilityStates.forEach((attribute) => {
      this.tooltipsArray.push(getTooltipVisibilityState(attribute.value));
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.attribute) {
      this.checkStillLoading();
    }
  }

  updateVisibility(option: string, attribute: Attribute) {
    const visibility = attributeVisibilityStates[option].value;
    this.projectApolloService.updateAttribute(this.project.id, attribute.id, null, null, null, null, visibility).pipe(first()).subscribe();
  }

  updatePrimaryKey(attribute: Attribute) {
    this.projectApolloService.updateAttribute(this.project.id, attribute.id, null, !attribute.isPrimaryKey, null, null, null).pipe(first()).subscribe();
  }

  private checkStillLoading() {
    this.somethingLoading = this.attributes.length == 0;
  }
}

