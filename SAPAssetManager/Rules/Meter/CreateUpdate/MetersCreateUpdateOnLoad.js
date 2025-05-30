import libMeter from '../../Meter/Common/MeterLibrary';
import style from '../../Common/Style/StyleFormCellButton';
import Stylizer from '../../Common/Style/Stylizer';
import hideCancel from '../Common/HideCancelOnPageLoad';
import libCom from '../../Common/Library/CommonLibrary';
import IsNewLayoutEnabled from '../../Common/IsNewLayoutEnabled';
import NewMeterSectionLibrary from '../Common/NewMeterSectionLibrary';

export default function MetersCreateUpdateOnLoad(context) {
    const {
        INSTALL,
        REP_INST,
    } = NewMeterSectionLibrary.getMeterISOConstants(context);

    let meterTransactionType = libMeter.getMeterTransactionType(context);

    if (!context.getClientData().LOADED) {
        let orderISULink = context.binding;
        if (context.evaluateTargetPathForAPI('#Page:-Previous').getClientData().FromErrorArchive || context.evaluateTargetPathForAPI('#Page:-Previous').getClientData().ErrorObject) {
            meterTransactionType = context.binding.ISUProcess + '_EDIT';
        }
        
        if (meterTransactionType === INSTALL || meterTransactionType === REP_INST) {
            //setup connection object
            setupConnectionObject(context);
        } else {
            // set device readlink into ClientData
            context.getClientData().DeviceReadLink = orderISULink.Device_Nav['@odata.readLink'];
            context.getClientData().DeviceCategory = orderISULink.Device_Nav.DeviceCategory;
            context.getClientData().Division = orderISULink.Device_Nav.RegisterGroup_Nav.Division;
            context.getClientData().Device = orderISULink.Device_Nav.Device;

            // set goods movement readlink into ClientData if exist
            if (orderISULink.Device_Nav.GoodsMovement_Nav && orderISULink.Device_Nav.GoodsMovement_Nav[0]) {
                context.getClientData().GoodMovementReadLink = orderISULink.Device_Nav.GoodsMovement_Nav[0]['@odata.readLink'];
            }
        }

        context.getClientData().LOADED = true;
    }

    if (context.binding?.['@odata.type'] !== '#sap_mobile.DisconnectionObject') {
        styleMeterSection(context);
        styleConnectionSection(context);
        updateControls(context);
    }

    style(context, 'DiscardButton');
    hideCancel(context);
    libCom.saveInitialValues(context);
}

function styleMeterSection(pageProxy) {
    let formCellContainer = pageProxy.getControl('FormCellContainer');
    let stylizer = new Stylizer(['GrayText']);
    let MeterLstPkr = formCellContainer.getControl('MeterLstPkr');
    stylizer.apply(MeterLstPkr , 'Value');

    if (!IsNewLayoutEnabled(pageProxy)) {
        let ManufacturerProp = formCellContainer.getControl('ManufacturerProp');
        let RegisterGroupProp = formCellContainer.getControl('RegisterGroupProp');
        let DeviceProp = formCellContainer.getControl('DeviceProp');
        let DivisionProp = formCellContainer.getControl('DivisionProp');
        stylizer.apply(ManufacturerProp, 'Value');
        stylizer.apply(RegisterGroupProp, 'Value');
        stylizer.apply(DeviceProp, 'Value');
        stylizer.apply(DivisionProp, 'Value');
    }
}

function styleConnectionSection(pageProxy) {
    let formCellContainer = pageProxy.getControl('FormCellContainer');
    let stylizer = new Stylizer(['GrayText']);
    let ConnectionLstPkr = formCellContainer.getControl('ConnectionLstPkr');
    let DeviceLocationLstPkr = formCellContainer.getControl('DeviceLocationLstPkr');
    let PremiseLstPkr = formCellContainer.getControl('PremiseLstPkr');
    let InstallationLstPkr = formCellContainer.getControl('InstallationLstPkr');

    stylizer.apply(ConnectionLstPkr , 'Value');
    stylizer.apply(DeviceLocationLstPkr, 'Value');
    stylizer.apply(PremiseLstPkr, 'Value');
    stylizer.apply(InstallationLstPkr, 'Value');

    if (IsNewLayoutEnabled(pageProxy)) {
        const divisionPicker = formCellContainer.getControl('DivisionLstPkr');
        if (divisionPicker) {
            stylizer.apply(divisionPicker, 'Value');
        }
    }
}

/**
 * 
 * @param {*} context 
 */
function setupConnectionObject(context) {
    let isuLink = context.binding;

    /**
     * ConnObject -> DeviceLocation -> Premise -> Installation
     * Need to check from the bottom up
     * Case 1: If Installation is not empty, nothing need to be done. Since all parent level would not be empty as well
     * Case 2: If Premise is not empty, update the Installation list picker
     * Case 3: If DeviceLocation is not empty, update the Premise, and Installation ListPicker
     * Case 4: If ConnObject is not empty, update the DeviceLocation, Premise, and Installation ListPicker
     */

    //case 1: Installation is not empty
    if (isuLink.Installation) {
        //Nothing to do here, b/c Installation is not empty, which mean parent level are not empty as well
    } else if (isuLink.Premise) {
        //case 2: Premise is not empty, which mean Installation is empty
        updateInstallation(context);
    } else if (isuLink.DeviceLocation) {
        //case 3:
        updatePremise(context);
    } else {
        //case 4:
        updateDeviceLocation(context);
    }
}

function updateInstallation(context) {
    let formCellContainer = context.getControl('FormCellContainer');

    let installationControl = formCellContainer.getControl('InstallationLstPkr');
    let installCtrlSpecifier = installationControl.getTargetSpecifier();

    let premiseReadLink = context.binding.Premise_Nav['@odata.readLink'];
    let installationEntitySet = `${premiseReadLink}/Installation_Nav`;

    installCtrlSpecifier.setEntitySet(installationEntitySet);
    installCtrlSpecifier.setQueryOptions('');
    installationControl.setTargetSpecifier(installCtrlSpecifier);
}

function updatePremise(context) {
    let formCellContainer = context.getControl('FormCellContainer');

    let premiseControl = formCellContainer.getControl('PremiseLstPkr');
    let premiseCtrlSpecifier = premiseControl.getTargetSpecifier();

    let deviceLocReadLink = context.binding.DeviceLocation_Nav['@odata.readLink'];
    let premiseEntitySet = `${deviceLocReadLink}/Premise_Nav`;

    premiseCtrlSpecifier.setEntitySet(premiseEntitySet);
    premiseCtrlSpecifier.setQueryOptions('$orderby=Premise');
    premiseControl.setTargetSpecifier(premiseCtrlSpecifier);
}

function updateDeviceLocation(context) {
    let formCellContainer = context.getControl('FormCellContainer');

    let deviceLocControl = formCellContainer.getControl('DeviceLocationLstPkr');
    let deviceLocCtrlSpecifier = deviceLocControl.getTargetSpecifier();

    let connObjectReadLink = context.binding.ConnectionObject_Nav['@odata.readLink'];
    let deviceLocEntitySet = `${connObjectReadLink}/DeviceLocations_Nav`;

    deviceLocCtrlSpecifier.setEntitySet(deviceLocEntitySet);
    deviceLocCtrlSpecifier.setQueryOptions('');
    deviceLocControl.setTargetSpecifier(deviceLocCtrlSpecifier);
}

function updateControls(context) {
    if (context.binding.Device_Nav?.GoodsMovement_Nav?.length) {
        const goodsMovement = context.binding.Device_Nav.GoodsMovement_Nav[0];

        if (goodsMovement.MovementType || goodsMovement.Plant || goodsMovement.StorageLocation) {
            libCom.getControlProxy(context, 'StorageLocationLstPkr').setVisible(true);
            libCom.getControlProxy(context, 'ReceivingPlantLstPkr').setVisible(true);
            libCom.getControlProxy(context, 'MovementTypeLstPkr').setVisible(true);
        }
    } else {
        const installationId = context.binding?.Device_Nav?.Installation;
        libCom.getControlProxy(context, 'StorageLocationLstPkr').setVisible(!!installationId);
        libCom.getControlProxy(context, 'ReceivingPlantLstPkr').setVisible(!!installationId);
        libCom.getControlProxy(context, 'MovementTypeLstPkr').setVisible(!!installationId);
    }
}
