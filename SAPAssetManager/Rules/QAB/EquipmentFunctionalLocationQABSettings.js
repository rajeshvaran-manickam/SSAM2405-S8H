import QABSettings from '../QAB/QABSettings';
import libPersona from '../Persona/PersonaLibrary';
import libCom from '../Common/Library/CommonLibrary';
import GetAddOrderButtonTitle from '../QAB/GetAddOrderButtonTitle';
import EquipmentTakeReadingIsVisible from '../Equipment/EquipmentTakeReadingIsVisible';
import IsGISEnabled from '../Maps/IsGISEnabled';
import IsViewMapButtonVisible from '../QAB/IsViewMapButtonVisible';
import IsNewLayoutEnabled from '../Common/IsNewLayoutEnabled';
import IsOnlineFunctionalLocation from '../FunctionalLocation/IsOnlineFunctionalLocation';


export default class EquipmentFunctionalLocationQABSettings extends QABSettings {
    constructor(context, isS4) {
        super(context, `${libPersona.getActivePersona(context)}-${libCom.getPageName(context)}${isS4 ? '-S4' : ''}`);
        this._isEquipment = context.binding['@odata.type'] === context.getGlobalDefinition('/SAPAssetManager/Globals/ODataTypes/Equipment.global').getValue();
        this._isOnlineEquipment = context.binding['@odata.type'] === context.getGlobalDefinition('/SAPAssetManager/Globals/ODataTypes/OnlineEquipment.global').getValue();
        this._isS4 = isS4;
        this._isOnlineFloc = IsOnlineFunctionalLocation(context);
    }

    async generateChips() {
        let chips = [];

        if (this._isOnlineEquipment || this._isOnlineFloc) {
            chips = [
                this._createAddWorkOrderChip(),
                this._createAddNotificationChip(),
            ];
        } else {
            chips = [
                this._createAddWorkOrderChip(),
                this._createAddNotificationChip(),
                await this._createTakeReadingsChip(),
                this._createHierarchyChip(),
                await this._createDownloadDocumentsChip(),
                await this._createViewMapChip(),
                this._createAddServiceOrderChip({ 'Label': this._context.localizeText('add_service_order') }),
                this._createAddServiceRequestChip({ 'Label': this._context.localizeText('add_service_request') }),
            ];
        }

        return super.generateChips(chips);
    }

    _createAddWorkOrderChip() {
        return super._createAddWorkOrderChip({
            'Label': GetAddOrderButtonTitle(this._context),
        });
    }

    _createAddNotificationChip() {
        return super._createAddNotificationChip({
            'Label': this._context.localizeText('add_notification'),
        });
    }

    async _createTakeReadingsChip() {
        return super._createTakeReadingsChip({
            'IsButtonEnabled': await EquipmentTakeReadingIsVisible(this._context),
        });
    }

    _createHierarchyChip() {
        const isEnabled = IsNewLayoutEnabled(this._context);

        return this._createChip({
            'Label': this._context.localizeText('hierarchy'),
            'Icon': '$(PLT,/SAPAssetManager/Images/QABHierarchy.png,/SAPAssetManager/Images/QABHierarchy.android.png)',
            'IsEnabled': isEnabled,
            'IsButtonEnabled': true,
            'IsButtonVisible': true,
            'Action': this._isEquipment ? 
                '/SAPAssetManager/Rules/Equipment/EquipmentHierarchyPageNav.js' :
                '/SAPAssetManager/Rules/FunctionalLocation/FunctionalLocationHierarchyPageNav.js',
            '_Name': 'HIERARCHY',
        });
    }

    async _createViewMapChip() {
        return super._createViewMapChip({
            'IsEnabled': IsGISEnabled(this._context),
            'IsButtonEnabled': await IsViewMapButtonVisible(this._context),
            'IsButtonVisible': IsGISEnabled(this._context),
            'Action': this._isEquipment ?
                '/SAPAssetManager/Rules/Equipment/EquipmentMapNav.js' :
                '/SAPAssetManager/Rules/FunctionalLocation/FunctionalLocationMapNav.js',
        });
    }
}
