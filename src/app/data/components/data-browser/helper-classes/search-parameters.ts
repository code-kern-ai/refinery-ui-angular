import { SearchOperator } from "./search-operators";

export function getBasicGroupItems(
  group: SearchGroup,
  groupKey: string
): SearchGroupItem[] {
  switch (group) {
    case SearchGroup.ATTRIBUTES:
      return [getBasicSearchItem(SearchItemType.ATTRIBUTE, groupKey)];
    case SearchGroup.USER_FILTER:
      return [getBasicSearchItem(SearchItemType.USER, groupKey)];
    case SearchGroup.LABELING_TASKS:
      return [getBasicSearchItem(SearchItemType.LABELING_TASK, groupKey)];
    case SearchGroup.ORDER_STATEMENTS:
      return [getBasicSearchItem(SearchItemType.ORDER_BY, groupKey)];
    case SearchGroup.COMMENTS:
      return [getBasicSearchItem(SearchItemType.COMMENTS, groupKey)];
  }
}

export function getBasicSearchItem(
  item: SearchItemType,
  groupKey: string
): SearchGroupItem {
  switch (item) {
    case SearchItemType.ATTRIBUTE:
      return {
        type: SearchItemType.ATTRIBUTE,
        group: SearchGroup.ATTRIBUTES,
        groupKey: groupKey,
        addText: 'Enter any string',
        defaultValue: 'Any Attribute',
        operator: SearchOperator.CONTAINS,
      };
    case SearchItemType.USER:
      return {
        type: SearchItemType.USER,
        group: SearchGroup.USER_FILTER,
        groupKey: groupKey,
        addText: 'much question, so wow',
      };
    case SearchItemType.LABELING_TASK:
      return {
        type: SearchItemType.LABELING_TASK,
        group: SearchGroup.LABELING_TASKS,
        groupKey: groupKey,
        addText: 'much question, so wow',
      };
    case SearchItemType.ORDER_BY:
      return {
        type: SearchItemType.ORDER_BY,
        group: SearchGroup.ORDER_STATEMENTS,
        groupKey: groupKey,
        addText: 'Random sampling',
      };
    case SearchItemType.COMMENTS:
      return {
        type: SearchItemType.COMMENTS,
        group: SearchGroup.COMMENTS,
        groupKey: groupKey,
        addText: 'much question, so wow',
      };
  }
}

export function getBasicSearchGroup(
  group: SearchGroup,
  sortOrder: number,
  nameAdd: string = '',
  keyAdd: string = null,
): SearchGroupElement {
  return {
    group: group,
    key: group + (keyAdd ? '_' + keyAdd : ''),
    sortOrder: sortOrder,
    isOpen: false,
    inOpenTransition: false,
    name: getNameForGroupKey(group),
    nameAdd: nameAdd,
    subText: getSubTextForGroupKey(group),
  };
}

function getNameForGroupKey(group: SearchGroup): string {
  switch (group) {
    case SearchGroup.ATTRIBUTES:
      return 'Attributes';
    case SearchGroup.USER_FILTER:
      return 'Users';
    case SearchGroup.LABELING_TASKS:
      return 'Labeling task:';
    case SearchGroup.ORDER_STATEMENTS:
      return 'Result Order';
    case SearchGroup.COMMENTS:
      return 'Comments';
  }
  return '';
}

function getSubTextForGroupKey(group: SearchGroup): string {
  switch (group) {
    case SearchGroup.ATTRIBUTES:
      return 'Filter on attributes of your records';
    case SearchGroup.USER_FILTER:
      return 'Filter manual labels by creation user';
    case SearchGroup.LABELING_TASKS:
      return 'Choose from anything related to';
    case SearchGroup.ORDER_STATEMENTS:
      return 'Order your results';
    case SearchGroup.COMMENTS:
      return 'Filter on comments';
  }
  return '';
}

export type SearchInfo = {
  key: string;
  target: string;
  opterator: SearchOperator;
  value: string[];
};
export type SearchGroupElement = {
  group: SearchGroup;
  key: string;
  sortOrder: number;
  isOpen: boolean;
  inOpenTransition: boolean;
  name: string;
  nameAdd: string;
  subText: string;
};

export type SearchGroupItem = {
  type: SearchItemType;
  defaultValue?: string;
  group: SearchGroup;
  groupKey: string;
  addText: string;
  operator?: SearchOperator;
  hasComments?: boolean;
};

export enum SearchItemType {
  ATTRIBUTE = 'ATTRIBUTE',
  USER = 'USER',
  LABELING_TASK = 'LABELING_TASK',
  ORDER_BY = 'ORDER_BY',
  COMMENTS = 'COMMENTS'
}

export enum SearchGroup {
  ATTRIBUTES = 'ATTRIBUTES',
  LABELING_TASKS = 'LABELING_TASKS',
  ORDER_STATEMENTS = 'ORDER_STATEMENTS',
  USER_FILTER = 'USER_FILTER',
  COMMENTS = 'COMMENTS'
}

export enum StaticOrderByKeys {
  MODEL_CALLBACK_CONFIDENCE = "MODEL_CALLBACK_CONFIDENCE",
  WEAK_SUPERVISION_CONFIDENCE = 'WEAK_SUPERVISION_CONFIDENCE',
  RANDOM = 'RANDOM'
}

export enum Slice {
  STATIC_DEFAULT = "STATIC_DEFAULT",
  STATIC_OUTLIER = "STATIC_OUTLIER",
  DYNAMIC_DEFAULT = "DYNAMIC_DEFAULT",
}


export function getDescriptionForSliceType(sliceType: string): string {
  switch (sliceType) {
    case Slice.STATIC_DEFAULT:
      return 'Static Slice';
    case Slice.STATIC_OUTLIER:
      return 'Outlier Slice';
    case Slice.DYNAMIC_DEFAULT:
      return 'Dynamic Slice';
  }
  return '';
}
