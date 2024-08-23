import PhaseControlVisible from '../PhaseControl/PhaseControlVisible';
import libCom from '../../Common/Library/CommonLibrary';
import Logger from '../../Log/Logger';
import libPhase from '../../PhaseModel/PhaseLibrary';

export default function WorkOrderOperationSubPhase(context) {
    return libPhase.isPhaseModelActiveInDataObject(context, context.binding).then(isPhaseOrder => { //Only display if phase order type
        if (isPhaseOrder && PhaseControlVisible(context) && context.binding) {
            return context.read('/SAPAssetManager/Services/AssetManager.service', context.binding['@odata.readLink'] + '/OperationMobileStatus_Nav/OverallStatusCfg_Nav', ['SubphaseDesc'], '').then(result => {
                if (result.length && libCom.isDefined(result.getItem(0).SubphaseDesc)) {
                    return result.getItem(0).SubphaseDesc;
                } else if (context.binding.OperationMobileStatus_Nav.SubphaseDesc) {
                    return context.binding.OperationMobileStatus_Nav.SubphaseDesc;
                }
                return '';
            }).catch((error) => {
                Logger.error('EAMOverallStatusConfigs', error);
                return '';
            });
        }
        return '';
    });
}
