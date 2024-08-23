import isAndroid from '../../Common/IsAndroid';
import WorkOrderOperationsDefaultModeButtonVisible from './WorkOrderOperationsDefaultModeButtonVisible';

export default function FilterButtonVisible(context) {
	if (!isAndroid(context)) {
		//For iOS if the dropover is not visible then filter needs to be visible here
		if (WorkOrderOperationsDefaultModeButtonVisible(context)) {
			return false;
		} else {
			return true;
		}
	}
	return true;
}
