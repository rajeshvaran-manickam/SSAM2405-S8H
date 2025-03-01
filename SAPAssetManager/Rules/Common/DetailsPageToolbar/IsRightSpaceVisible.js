import pageToolbar from './DetailsPageToolbarClass';
import isRTL from '../IsRTL';
import IsWindows from '../IsWindows';

export default function IsRightSpaceVisible(context) {
    if (IsWindows(context)) {
        return false;
    }

    let toolbarItems = pageToolbar.getInstance().getToolbarItems(context);
    if (toolbarItems.length > 3) return true;

    let negativeButton = toolbarItems.find(item => item.TransitionType === 'N');
    if (negativeButton) return isRTL(context);

    return false;
}
