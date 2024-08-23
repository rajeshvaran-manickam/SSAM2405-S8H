import libSearch from './OnlineSearchLibrary';

export default function DeselectAllButtonVisible(context) {
    // multi-select mode is disabled for 2405 release
    return false && libSearch.selectDeselectButtonVisible(context, false);
}
