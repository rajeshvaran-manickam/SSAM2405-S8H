import queryOptions from '../SubOperations/SubOperationsListViewQueryOption';
import libCom from '../Common/Library/CommonLibrary';
import SubOperationChangeStatusOptions from './SubOperationChangeStatusOptions';
import pageToolbar from '../Common/DetailsPageToolbar/DetailsPageToolbarClass';

export default function SubOperationDetailsNav(context) {
    let pageProxy = context.getPageProxy();
    let actionBinding;
    let previousPageProxy;

    try {
        actionBinding = pageProxy.getActionBinding();
        previousPageProxy = pageProxy.evaluateTargetPathForAPI('#Page:-Previous');
    } catch (error) {
        return generateStatusOptionsAndNavigate(pageProxy);
    }

    if (previousPageProxy) {
        if (libCom.getPageName(previousPageProxy) === 'SubOperationDetailsPage' && previousPageProxy.getBindingObject().SubOperationNo === actionBinding.SubOperationNo) { //if the previous page was the parent workorder then, navigate back
            return context.executeAction('/SAPAssetManager/Actions/Page/ClosePage.action');
        }
    }

    return generateStatusOptionsAndNavigate(pageProxy);

}

function generateStatusOptionsAndNavigate(pageProxy) {
    /** @type {MyWorkOrderSubOperation} actionBinding */
    let actionBinding = pageProxy.getActionBinding();
    return pageProxy.read('/SAPAssetManager/Services/AssetManager.service', actionBinding['@odata.readLink'], [], queryOptions(pageProxy))
        .then(result => pageProxy.setActionBinding(result.getItem(0)))
        .then(() => SubOperationChangeStatusOptions(pageProxy, pageProxy.getActionBinding()))
        .then(items => pageToolbar.getInstance().generatePossibleToolbarItems(pageProxy, items, 'SubOperationDetailsPage'))
        .then(() => pageProxy.executeAction('/SAPAssetManager/Actions/WorkOrders/SubOperations/SubOperationDetailsNav.action'));
}
