import { FormArray, FormGroup } from "@angular/forms";
import { distinctUntilChanged, first, pairwise, startWith } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { tryParseJSON } from "src/app/util/helper-functions";
import { DataBrowserComponent } from "../data-browser.component";
import { getBasicGroupItems, getBasicSearchGroup, SearchGroup, SearchGroupItem } from "./search-parameters";

export class CommentsFilter {
    private dataBrowser: DataBrowserComponent;
    private projectApolloService: ProjectApolloService;

    constructor(dataBrowser: DataBrowserComponent, projectApolloService: ProjectApolloService) {
        this.dataBrowser = dataBrowser;
        this.projectApolloService = projectApolloService;
    }

    public addSearchGroup() {
        let searchGroupContainer = getBasicSearchGroup(
            SearchGroup.COMMENTS,
            (this.dataBrowser.groupSortOrder += 100)
        );
        this.dataBrowser.searchGroups.set(searchGroupContainer.key, searchGroupContainer);
        this.dataBrowser.fullSearch.set(
            searchGroupContainer.key,
            this.dataBrowser.formBuilder.group({ groupElements: this.dataBrowser.formBuilder.array([]) })
        );
        for (let baseItem of getBasicGroupItems(
            searchGroupContainer.group,
            searchGroupContainer.key
        )) {
            this.dataBrowser.getSearchFormArray(searchGroupContainer.key).push(
                this._commentsCreateSeachGroup(baseItem)
            );
        }
    }

    public buildSearchParamText(values): string {
        return values.hasComments[0].negate ? 'NO COMMENTS' : 'HAS COMMENTS';
    }

    private _commentsCreateSeachGroup(item: SearchGroupItem): FormGroup {
        let group = this.dataBrowser.formBuilder.group({
            id: ++this.dataBrowser.globalSearchGroupCount,
            group: item.group,
            groupKey: item.groupKey,
            active: false,
            negate: false,
            type: item.type,
            name: item.defaultValue,
            hasComments: this.buildHasCommentsArray(),
            updateDummy: true
        });

        this.dataBrowser.groupValueChangesSubscription$.push(group.valueChanges
            .pipe(pairwise(), distinctUntilChanged(), startWith(''))
            .subscribe(([prev, next]: [any, any]) => this.searchGroupItemChanged(group, prev, next)));

        // to ensure pairwise works as exprected
        group.get("updateDummy").setValue(false);
        return group;
    }

    private searchGroupItemChanged(
        group: FormGroup,
        previousValues,
        next
    ) {
        if (!previousValues) return;
        let values = group.getRawValue(); //to ensure disabled will be returned as well
        const somethingActive = this.somethingActive(values);
        const onlySearchChanged = this.onlySearchChanged(values, previousValues);
        if (!values.active && !previousValues.active && somethingActive && !onlySearchChanged) {
            group.get('active').setValue(true);
            return;
        } else if (values.active && !somethingActive) {
            group.get('active').setValue(false);
            return;
        }
        this.dataBrowser.updateSearchParameters.refreshSearchParams(values);
        this.dataBrowser.checkAndDisplayDisplayValuesChangedWarning();
        if (this.dataBrowser.activeSlice?.static) {
            this.dataBrowser.checkFilterChangedForStaticSlice();
        }
    }
    private somethingActive(values): boolean {
        for (let c of values.hasComments) {
            if (c.active) return true;
        }
        return false
    }

    private onlySearchChanged(values, previousValues): boolean {
        for (var i = 0; i < values.hasComments.length; i++) {
            if (values.hasComments[i].active != previousValues.hasComments[i].active ||
                values.hasComments[i].negate != previousValues.hasComments[i].negate) return false;
        }
        return true;
    }


    private buildHasCommentsArray(): FormArray {
        let array = this.dataBrowser.formBuilder.array([]);
        array.push(this.dataBrowser.formBuilder.group({
            active: false,
            negate: false
        }));
        return array;
    }


    public processCommentsFilter(key: string, filterGroups: Object): void {
        if (!this.dataBrowser.fullSearch.has(key)) { this.dataBrowser.displayOutdatedWarning = true; return; }
        const commentGroup: FormGroup = this.dataBrowser.getSearchFormArray(key).controls[0] as FormGroup;
        const filterValues = filterGroups[key].groupElements[0];
        const setSomething = this.dataBrowser.applyValuesToFormGroup(filterValues, commentGroup);
        let values = commentGroup.getRawValue();
        values.active = this.somethingActive(values);
        this.dataBrowser.updateSearchParameters.refreshSearchParams(values);
        if (setSomething) {
            commentGroup.get("updateDummy").setValue(true);
            this.dataBrowser.toggleGroupMenu(key, this.dataBrowser.getSearchGroupsHTMLByName(key), true);
        }
    }

    public collectRecordComments(parsedRecordData) {
        const currentRecordIds = parsedRecordData?.map((record) => record.id);
        if (!currentRecordIds || currentRecordIds.length == 0) return;
        this.projectApolloService.getRecordComments(this.dataBrowser.projectId, currentRecordIds).pipe(first()).subscribe((comments) => {
            if (!comments) return;
            const commentsParsed = tryParseJSON(comments);
            if (!commentsParsed) return;
            commentsParsed.forEach(e => {
                if (!this.dataBrowser.recordComments[e.record_id]) this.dataBrowser.recordComments[e.record_id] = [];
                this.dataBrowser.recordComments[e.record_id].push(e);
            });
        });
    }
}
