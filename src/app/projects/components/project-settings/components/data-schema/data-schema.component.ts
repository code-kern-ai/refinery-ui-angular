import { Component, Input, OnChanges } from '@angular/core';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { attributeVisibilityStates, getTooltipVisibilityState } from '../../../create-new-attribute/attributes-visibility-helper';
import { Attribute, AttributeVisibilityStates } from '../../entities/attribute.type';


@Component({
  selector: 'kern-data-schema',
  templateUrl: './data-schema.component.html',
  styleUrls: ['./data-schema.component.scss']
})
export class DataSchemaComponent implements OnChanges {

  @Input() project: Project;
  @Input() attributeVisibilityStates: AttributeVisibilityStates;
  @Input() attributes: Attribute[];
  @Input() pKeyValid: boolean;

  tooltipsArray: string[] = [];

  constructor(private projectApolloService: ProjectApolloService) {
  }

  ngOnChanges(changes) {
    this.attributes = changes.attributes?.currentValue;
    this.pKeyValid = changes.pKeyValid?.currentValue;
    this.attributes.forEach((attribute) => {
      this.tooltipsArray.push(getTooltipVisibilityState(attribute.visibility));
    });
  }

  updateVisibility(option: string, attribute: Attribute) {
    const visibility = attributeVisibilityStates[option].value;
    this.projectApolloService.updateAttribute(this.project.id, attribute.id, attribute.dataType, attribute.isPrimaryKey, attribute.name, attribute.sourceCode, visibility).pipe(first()).subscribe();
  }

  updatePrimaryKey(attribute: Attribute) {
    this.projectApolloService.updateAttribute(this.project.id, attribute.id, attribute.dataType, !attribute.isPrimaryKey, attribute.name, attribute.sourceCode, attribute.visibility).pipe(first()).subscribe();
  }
}

