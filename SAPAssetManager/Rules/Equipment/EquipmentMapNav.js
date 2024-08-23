import GetGeometryInformation from '../Common/GetGeometryInformation';
import libCommon from '../Common/Library/CommonLibrary';

export default function EquipmentMapNav(context) {
    if (context.getPageProxy().getClientData().geometry) {
        if (Object.keys(context.getPageProxy().getClientData().geometry).length > 0) {
            context.getPageProxy().setActionBinding(context.getPageProxy().getClientData().geometry);
            return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapNav.action');
        }
    } else {
        return GetGeometryInformation(context.getPageProxy(), 'EquipGeometries').then(function(value) {
            if (value && Object.keys(value).length > 0) {
                // create-update
                if (libCommon.getPageName(context) === 'EquipmentCreateUpdatePage') {
                    const onCreate = libCommon.IsOnCreate(context);
                    if (onCreate) {
                        return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapCreateNav.action');
                    } else {
                        // set action binding for edit case, if returned geometry is for equipment
                        if (value && value['@odata.type']=== '#sap_mobile.MyEquipment') {
                            context.getPageProxy().setActionBinding(value);
                        }
                        return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapUpdateNav.action');
                    }
                }

                context.getPageProxy().setActionBinding(value);
                return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapNav.action');
            }
            if (context.binding && context.binding['@odata.readLink']) {
                return context.read('/SAPAssetManager/Services/AssetManager.service', context.binding['@odata.readLink'] + '/FunctionalLocation', [], '').then(function(result) {
                    if (result && result.getItem(0)) {
                        context.getPageProxy().setActionBinding(result.getItem(0));
                        return context.executeAction('/SAPAssetManager/Actions/FunctionalLocation/FunctionalLocationDetailsNav.action');
                    }
                    // create
                    if (libCommon.getPageName(context) === 'EquipmentCreateUpdatePage') {
                        return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapCreateNav.action');
                    }
                    return null;
                });
            }
            // create
            if (libCommon.getPageName(context) === 'EquipmentCreateUpdatePage') {
                return context.executeAction('/SAPAssetManager/Actions/Equipment/EquipmentMapCreateNav.action');
            }
            return null;
        });
    }
}
