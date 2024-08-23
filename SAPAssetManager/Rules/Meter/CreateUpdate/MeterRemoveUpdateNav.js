import IsNewLayoutEnabled from '../../Common/IsNewLayoutEnabled';
import libCommon from '../../Common/Library/CommonLibrary';
import libMeter from '../../Meter/Common/MeterLibrary';
import NewMeterSectionLibrary from '../Common/NewMeterSectionLibrary';

export default function MeterRemoveUpdateNav(context) {
    libMeter.setMeterTransactionType(context);

    //set the CHANGSET flag to true
    libCommon.setOnChangesetFlag(context, true);
    if (IsNewLayoutEnabled(context)) {
        const readLink = getEntityReadLink(context);
        if (readLink) {
            return context.read('/SAPAssetManager/Services/AssetManager.service', readLink, [],'$expand=Device_Nav/DeviceCategory_Nav/Material_Nav,DeviceLocation_Nav/Premise_Nav,Device_Nav/RegisterGroup_Nav/Division_Nav,Device_Nav/Equipment_Nav/ObjectStatus_Nav/SystemStatus_Nav,Device_Nav/GoodsMovement_Nav,DeviceLocation_Nav/FuncLocation_Nav/Address/AddressCommunication,ConnectionObject_Nav/FuncLocation_Nav/Address/AddressCommunication,DeviceLocation_Nav/Premise_Nav,Workorder_Nav/OrderISULinks,Workorder_Nav/OrderMobileStatus_Nav').then(function(orderISULink) {
                let link = orderISULink.getItem(0);
                if (orderISULink.length > 1) {
                    link = orderISULink.find(item => !!item.Device_Nav);
                }
                if (link) {
                    context.setActionBinding(link);
                    if (libMeter.isLocal(link) && libMeter.isProcessed(link) && link.ISUProcess.substr(-5) !== '_EDIT') {
                        libMeter.setMeterTransactionType(context, link.ISUProcess + '_EDIT');
                    }
                }
                return context.executeAction('/SAPAssetManager/Actions/Meters/CreateUpdate/NewDesign/InstallMeterNav.action');
            });
        } else {
            return context.executeAction('/SAPAssetManager/Actions/Meters/CreateUpdate/NewDesign/InstallMeterNav.action');
        }
    }
    return context.executeAction('/SAPAssetManager/Actions/Meters/CreateUpdate/MeterCreateUpdateNav.action');
}

function getEntityReadLink(context) {
    if (context.getClientData().meterLink) {
        return context.getClientData().meterLink;
    } else if (!context.getPageProxy().currentPage.definition.name.includes('MeterDetailsPage')) {
        const woBinding = NewMeterSectionLibrary.getWorkOrderBinding(context);
        return woBinding['@odata.readLink'] + '/OrderISULinks';
    }

    return '';
}
