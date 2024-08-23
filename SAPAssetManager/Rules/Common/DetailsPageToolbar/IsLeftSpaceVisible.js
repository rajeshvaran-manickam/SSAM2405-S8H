import pageToolbar from './DetailsPageToolbarClass';
import isRTL from '../IsRTL';
import IsWindows from '../IsWindows';

export default function IsLeftSpaceVisible(context) {
    if (IsWindows(context)) {
        return false;
    }

    let toolbarItems = pageToolbar.getInstance().getToolbarItems(context);
    let negativeButton = toolbarItems.find(item => item.TransitionType === 'N');
    let isLTR = !isRTL(context);

    if (toolbarItems.length === 3 && !negativeButton) return isLTR;

    if (toolbarItems.length > 3) return true;

    if (toolbarItems.length === 1) return isLTR;

    return false;
}
