import FilterSettings from '../../../Filter/FilterSettings';

/** @param {IPageProxy} context */
export default function OperationalItemsTabPreFilters(context) {
    const defaultFilters = [context.createFilterCriteria(context.filterTypeEnum.Sorter, 'WCMDocumentHeaders/Priority', 'SortFilter', ['WCMDocumentHeaders/Priority'], false, context.localizeText('sort_filter_prefix'), [context.localizeText('related_safety_certificate_priority')])];
    const operationalItemsListPageproxy = context.evaluateTargetPathForAPI('#Page:OperationalItemsListViewPage');
    FilterSettings.saveInitialFilterForPage(operationalItemsListPageproxy, defaultFilters);
    return defaultFilters;
}
