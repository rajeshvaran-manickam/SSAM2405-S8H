import libCommon from '../../Common/Library/CommonLibrary';
import libWOStatus from '../../WorkOrders/MobileStatus/WorkOrderMobileStatusLibrary';
import { WorkOrderDetailsPageName } from '../../WorkOrders/Details/WorkOrderDetailsPageToOpen';

export default function PartDetailsPopover(context) {

    if (!libCommon.isEntityLocal(context.binding) && context.binding.BackFlushIndicator !== 'X') {

        try {
            context.evaluateTargetPathForAPI(`#Page:${WorkOrderDetailsPageName(context)}`);
        } catch (error) { //We started from an Operation
            return context.executeAction('/SAPAssetManager/Actions/Parts/PartDetailsPopover.action');
        }
        return libWOStatus.isOrderComplete(context).then(status => {
            if (!status) {
                return context.executeAction('/SAPAssetManager/Actions/Parts/PartDetailsPopover.action');
            }
            return '';
        });
    }
    return context.executeAction('/SAPAssetManager/Actions/Parts/PartDetailsNotesPopover.action');
}
