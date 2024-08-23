export const SafetyCertificateEventTypes = Object.freeze({
    MobileStatusChanged: 'MobileStatusChanged',
});

/** @param {IPageProxy} context  */
export default function SafetyCertificatesOnCustomEventDataReceived(context) {
    const { EventType } = context.getAppEventData();
    if (EventType === SafetyCertificateEventTypes.MobileStatusChanged) {
        context.getToolbar().redraw();
    }
}
