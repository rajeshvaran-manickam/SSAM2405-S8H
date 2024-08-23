import libCommon from '../../Common/Library/CommonLibrary';
import NotificationTypePkrDefaultOnCreate from '../NotificationTypePkrDefaultOnCreate';
import lamCopy from './NotificationCreateLAMCopy';
import NotificationCreateUpdatePartnerType from './NotificationCreateUpdatePartnerType';
import libNotif from '../NotificationLibrary';
import PreloadHierarchyListPickerValues from '../../HierarchyControl/PreloadHierarchyListPickerValues';

export default function NotificationCreateChangeSetNav(context, bindingParams) {
    libCommon.setOnChangesetFlag(context, true);
    libCommon.resetChangeSetActionCounter(context);
    libCommon.setOnCreateUpdateFlag(context, 'CREATE');

    //set the follow up flag for Equipment
    libNotif.setAddFromEquipmentFlag(context, true);
    //set the follow up flag for Functional Location
    libNotif.setAddFromFuncLocFlag(context, true);

    let contextBinding = libCommon.setBindingObject(context);
    if (!contextBinding && context.getActionBinding) {
        contextBinding = context.getActionBinding();
    }
    if (!contextBinding && context.getPageProxy().getActionBinding()) {
        contextBinding = context.getPageProxy().getActionBinding();
    }
    PreloadHierarchyListPickerValues(context, '/SAPAssetManager/Pages/Notifications/NotificationCreateUpdate.page');
    return context.read('/SAPAssetManager/Services/AssetManager.service', 'NotificationTypes', [], "$select=PriorityType&$filter=NotifType eq '" + libCommon.getAppParam(context, 'NOTIFICATION', 'NotificationType') + "'").then(function(data) {
        return NotificationTypePkrDefaultOnCreate(context).then(notifTypeDefault => {
            let binding = {'NotifPriority': {}};
            if (data.length > 0) // Ensure notification create doesn't bomb out if no default is set
                binding.PriorityType = data.getItem(0).PriorityType;
            if (bindingParams) {
                Object.assign(binding, bindingParams);
            }
            if (notifTypeDefault && !binding.NotificationType) {
                binding.NotificationType = notifTypeDefault;
            }
            if (contextBinding?.['@odata.type'] === '#sap_mobile.MyFunctionalLocation' || contextBinding?.['@odata.type'] === '#sap_mobile.FunctionalLocation') {
                binding.HeaderFunctionLocation = contextBinding.FuncLocIdIntern;
                binding.HeaderFlocId = contextBinding.FuncLocId;
                binding.HeaderFlocDescription = contextBinding.FuncLocDesc;
                binding.OnlineFloc = contextBinding['@odata.type'] === '#sap_mobile.FunctionalLocation';
            } else if (contextBinding && contextBinding['@odata.type'] === '#sap_mobile.MyEquipment') {
                binding.HeaderEquipment = contextBinding.EquipId;
                binding.HeaderFunctionLocation = contextBinding.FuncLocIdIntern || contextBinding.FunctionalLocation?.FuncLocIdIntern;
            } else if (contextBinding && contextBinding['@odata.type'] === '#sap_mobile.Equipment') { // online use case
                binding.HeaderEquipment = contextBinding.EquipId;
                binding.HeaderEquipmentDesc = contextBinding.EquipDesc;
                binding.OnlineEquipment = true;
            }
            let prevPageProxy;
            try {
                if (libCommon.getPageName(context) === 'SideMenuDrawer') {
                    prevPageProxy = context.evaluateTargetPathForAPI('#Page:-Previous');
                }
            } catch (err) {
                // do nothing
            }
            if (prevPageProxy) {
                prevPageProxy.setActionBinding(binding);
            } else {
                if (context.setActionBinding) {
                    context.setActionBinding(binding);
                } else {
                    context.getPageProxy().setActionBinding(binding);
                }
            }
            libCommon.setStateVariable(context, 'LocalId', ''); //Reset before starting create
            libCommon.setStateVariable(context, 'lastLocalItemNumber', '');
            libCommon.setStateVariable(context,'NotifType', notifTypeDefault);
            return NotificationCreateUpdatePartnerType(context, context.binding, notifTypeDefault).finally(() => {
                return (prevPageProxy || context).executeAction('/SAPAssetManager/Actions/Notifications/ChangeSet/NotificationCreateChangeset.action').then(() => {
                    return lamCopy(context);
                });
            });
        });
    });
}
