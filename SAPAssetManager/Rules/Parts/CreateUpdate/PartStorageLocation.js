import libCommon from '../../Common/Library/CommonLibrary';

export default function PartStorageLocation(context) {
    let isBOM = context.binding && (context.binding['@odata.type'] === context.getGlobalDefinition('/SAPAssetManager/Globals/ODataTypes/BOM.global').getValue());
    if (isBOM) {
        if (libCommon.isDefined(libCommon.getTargetPathValue(context, '#Control:StorageLocationLstPkr/#Value'))) {
            return libCommon.getTargetPathValue(context, '#Control:StorageLocationLstPkr/#Value')[0].ReturnValue;
        }
        return '';
    } else {
        const controls = libCommon.getControlDictionaryFromPage(context);
        let materialPickerValueControl = controls.MaterialLstPkr;
        if (materialPickerValueControl) {
            let materialPickerValue = libCommon.getTargetPathValue(context,'#Control:MaterialLstPkr/#Value');
            let isOnline = libCommon.getControlProxy(context, 'OnlineSwitch') && libCommon.getControlProxy(context, 'OnlineSwitch').getValue();
            let service = '/SAPAssetManager/Services/AssetManager.service';
            if (isOnline) {
                service = '/SAPAssetManager/Services/OnlineAssetManager.service';
            }
            if (libCommon.isDefined(materialPickerValue)) {
                return context.read(service, materialPickerValue[0].ReturnValue, []).then(function(result) {
                    return result.getItem(0).StorageLocation;
                });
            }
            return '';
        }
        return '';
    }
}
