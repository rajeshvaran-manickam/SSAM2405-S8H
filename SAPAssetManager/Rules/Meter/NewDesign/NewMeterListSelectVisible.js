import MetersListViewEntitySet from '../MetersListViewEntitySet';
import NewMeterListMultipleModeDisabled from './NewMeterListMultipleModeDisabled';

/**
* Get visibility of Select button based on selection mode and amount of local items
* @param {IClientAPI} context
*/
export default function NewMeterListSelectVisible(context) {
    const isMultipleModeDisabled = NewMeterListMultipleModeDisabled(context);
    if (isMultipleModeDisabled) {
        const meterEntity = MetersListViewEntitySet(context);
        const meterQuery = '$filter=sap.entityexists(Device_Nav) and sap.islocal()';
        return context.count('/SAPAssetManager/Services/AssetManager.service', meterEntity, meterQuery).then(count => !!count);
    }
    return false;
}
