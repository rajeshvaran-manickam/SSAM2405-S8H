import IsOperationLevelAssigmentType from '../../WorkOrders/Operations/IsOperationLevelAssigmentType';
import common from '../../Common/Library/CommonLibrary';
import IsSubOperationLevelAssigmentType from '../../WorkOrders/SubOperations/IsSubOperationLevelAssigmentType';
import IsFSMCSSectionVisible from '../../ServiceOrders/IsFSMCSSectionVisible';
import IsNewLayoutEnabled from '../../Common/IsNewLayoutEnabled';

export default function ObjectCardOrderButtonVisible(context) {
    const COMPLETE = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/CompleteParameterName.global').getValue());
    const TRANSFER = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/TransferParameterName.global').getValue());

    if (IsFSMCSSectionVisible(context) && IsNewLayoutEnabled(context) && IsOperationLevelAssigmentType(context)) {
       return false;
    }

    if (IsOperationLevelAssigmentType(context)) {
        let mobileStatus = context.binding.OperationMobileStatus_Nav.MobileStatus;
        if (mobileStatus === COMPLETE || mobileStatus === TRANSFER) {
            return false;
        }
        return true;
    } else if (IsSubOperationLevelAssigmentType(context)) {
        return false;
    } else {
        return true;
    }
}
