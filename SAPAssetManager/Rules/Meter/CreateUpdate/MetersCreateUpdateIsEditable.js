import libMeter from '../../Meter/Common/MeterLibrary';
import NewMeterSectionLibrary from '../Common/NewMeterSectionLibrary';

export default function MetersCreateUpdateIsEditable(context) {
    const binding = context.getPageProxy().binding;
    const controlName = context.getName();
    const meterTransactionType = libMeter.getMeterTransactionType(context);
    const { INSTALL, REP_INST } = NewMeterSectionLibrary.getMeterISOConstants(context);

    if (meterTransactionType === INSTALL || meterTransactionType === REP_INST) {
        switch (controlName) {
            case 'DeviceLocationLstPkr':
                return (binding.DeviceLocation === '');
            case 'PremiseLstPkr':
                return (binding.Premise === '');
            case 'InstallationLstPkr':
                return (binding.Installation === '');
            case 'ConnectionLstPkr': 
                return !binding.ConnectionObject_Nav?.ConnectionObject;
            default:
                return true;
        }
    }

    return false;
}

