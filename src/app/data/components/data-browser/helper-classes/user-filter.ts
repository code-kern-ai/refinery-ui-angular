import { FormArray, FormGroup } from "@angular/forms";
import { Observable } from "rxjs";
import { distinctUntilChanged, first, pairwise, startWith } from "rxjs/operators";
import { labelSourceToString } from "src/app/base/enum/graphql-enums";
import { OrganizationApolloService } from "src/app/base/services/organization/organization-apollo.service";
import { DataBrowserComponent } from "../data-browser.component";
import { getBasicGroupItems, getBasicSearchGroup, SearchGroup, SearchGroupItem } from "./search-parameters";
import { UpdateSearchParameters } from "./update-search-parameters";

export class UserFilter {
    private dataBrowser: DataBrowserComponent;
    private organizationApolloService: OrganizationApolloService;
    private users: any;
    public userMap: Map<string, any> = new Map<string, any>();
    public currentUserInfo: any;
    private updateSearchParameters: UpdateSearchParameters;

    constructor(dataBrowser: DataBrowserComponent, organizationApolloSerivce: OrganizationApolloService) {
        this.dataBrowser = dataBrowser;
        this.organizationApolloService = organizationApolloSerivce;
    }

    prepareUserRequest(): Observable<any> {
        const pipeFirst = this.organizationApolloService.getOrganizationUsersWithCount(this.dataBrowser.projectId)
            .pipe(first());
        pipeFirst.subscribe(users => {
            this.userMap.clear();
            this.users = users;

            this.users.forEach(user => {
                let sum = 0;
                if (user.counts) user.counts.forEach(e => {
                    sum += e.count;
                    e.source = labelSourceToString(e.source_type);
                });
                user.countSum = sum;
                this.userMap.set(user.user.id, user);
            });
        });
        return pipeFirst;
    }

    public addSearchGroup() {

        let searchGroupContainer = getBasicSearchGroup(
            SearchGroup.USER_FILTER,
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
                this.createSearchGroup(baseItem)
            );
        }
    }

    public buildSearchParamText(values): string {
        let text = this.dataBrowser._labelingTaskBuildSearchParamTextPart(
            values.users,
            'User'
        );

        if (values.negate) text = 'NOT (' + text + ')';
        return text;
    }

    private createSearchGroup(item: SearchGroupItem): FormGroup {
        let group = this.dataBrowser.formBuilder.group({
            id: ++this.dataBrowser.globalSearchGroupCount,
            group: item.group,
            groupKey: item.groupKey,
            active: false,
            negate: false,
            type: item.type,
            name: item.defaultValue,
            addText: item.addText,
            users: this.buildUserFormArray(),
            updateDummy: true
        });

        this.dataBrowser.groupValueChangesSubscribtion$.push(group.valueChanges
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
        this.updateSearchParameters.refreshSearchParams(values);
        this.dataBrowser.checkAndDisplayDisplayValuesChangedWarning();
        if (this.dataBrowser.activeSlice?.static) {
            this.dataBrowser.checkFilterChangedForStaticSlice();
        }
    }
    private somethingActive(values): boolean {
        for (let c of values.users) {
            if (c.active) return true;
        }
        return false
    }

    private onlySearchChanged(values, previousValues): boolean {
        for (var i = 0; i < values.users.length; i++) {
            if (values.users[i].active != previousValues.users[i].active ||
                values.users[i].negate != previousValues.users[i].negate) return false;
        }
        return true;
    }


    private buildUserFormArray(): FormArray {
        let array = this.dataBrowser.formBuilder.array([]);
        for (const u of this.users) {
            if (u.countSum == 0) continue;
            const user = u.user ? u.user : u;
            let name = "Unknown";
            let shortName = "Unknown";
            if (user.firstName) {
                name = user.firstName + ' ' + user.lastName;
                shortName = user.firstName[0] + '. ' + user.lastName;
            }

            array.push(this.dataBrowser.formBuilder.group({
                id: user.id,
                active: false,
                negate: false,
                displayName: name,
                name: shortName,
                dataTip: user.mail ? user.mail : "Unknown user ID"
            }));
        }

        return array;
    }


    public processUserFilters(key: string, filterGroups: Object): void {
        if (!this.dataBrowser.fullSearch.has(key)) { this.dataBrowser.displayOutdatedWarning = true; return; }
        const userGroup: FormGroup = this.dataBrowser.getSearchFormArray(key).controls[0] as FormGroup;
        const filterValues = filterGroups[key].groupElements[0];
        const setSomething = this.dataBrowser.applyValuesToFormGroup(filterValues, userGroup);
        let values = userGroup.getRawValue();
        values.active = this.somethingActive(values);
        this.updateSearchParameters.refreshSearchParams(values);
        if (setSomething) {
            userGroup.get("updateDummy").setValue(true);
            this.dataBrowser.toggleGroupMenu(key, this.dataBrowser.getSearchGroupsHTMLByName(key), true);
        }
    }
}
