
import libCom from '../../Common/Library/CommonLibrary';
import libForms from './FSMSmartFormsLibrary';
import FSMFormsInstancesListViewCaption from './FSMFormsInstancesListViewCaption';
import ModifyListViewSearchCriteria from '../../LCNC/ModifyListViewSearchCriteria';

export default function FSMFormsInstancesListViewQueryOption(context) {

    if (libForms.isSmartFormsFeatureEnabled(context)) {
        checkPageName(context);

        let searchString = context.searchString;
        let filter = '';
        let queryBuilder;
        if (searchString) {
            filter = getSearchQuery(context, searchString.toLowerCase());
        }
        if ((libCom.isDefined(context.binding) && libCom.isDefined(context.binding.OperationNo) && libCom.isDefined(context.binding.OrderId))) {
            queryBuilder = libForms.getOperationFSMFormsQueryOptions(context);
            if (queryBuilder) {
                if (filter) {
                    queryBuilder.filter().and(filter);
                }
                return queryBuilder;
            }
        }
        queryBuilder = libForms.getFSMFormsQueryOptions(context);
        if (filter) {
            queryBuilder.filter(filter);
        }
        return queryBuilder;
    }
    return '';
}

function checkPageName(context) {
    if (libCom.getPageName(context) === 'FSMSmartFormsInstancesListViewPage') {
        FSMFormsInstancesListViewCaption(context.getPageProxy());
    }
}

function getSearchQuery(context, searchString) {
    let searchQuery = '';

    if (searchString) {
        let searchByProperties = ['Description', 'WorkOrder', 'Operation', 'FSMFormTemplate_Nav/Description', 'FSMFormTemplate_Nav/Name'];
        ModifyListViewSearchCriteria(context, 'FSMFormInstance', searchByProperties);
        
        searchQuery = libCom.combineSearchQuery(searchString, searchByProperties);
    }

    return searchQuery;
}
