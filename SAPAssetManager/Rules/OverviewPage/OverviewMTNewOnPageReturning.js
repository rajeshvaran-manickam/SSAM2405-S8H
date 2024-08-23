import IsAndroid from '../Common/IsAndroid';
import OnDateChanged from '../Common/OnDateChanged';
import libPersona from '../Persona/PersonaLibrary';
import QABRedrawExtension from '../QAB/QABRedrawExtension';

export default function OverviewMTNewOnPageReturning(context) {
    if (libPersona.isMaintenanceTechnician(context)) {
        // Refresh the map view
        let sectionedTable = context.getControls()[0];
        let mapSection = sectionedTable.getSection('MapExtensionSection');
        if (mapSection) {
            let mapViewExtension = mapSection.getExtensions()[0];
            if (IsAndroid(context)) {
                mapSection.redraw(true);
            } else {
                mapViewExtension.update();
            }
        }

        // Refresh the QAB
        let qabSection = sectionedTable.getSection('QuickActionBarExtensionSection');
        if (qabSection) {
            QABRedrawExtension(context);
        }

        // Refresh the High Prority Work Orders
        sectionedTable.getSection('MyNotificationSection').redraw();

        //Refresh the My Work Cards
        sectionedTable.getSection('ObjectCardTest').redraw(true);

        // Check to see if this date has changed
        let lastDateChange = context.getClientData().lastDateChange;
        let now = new Date();

        if (lastDateChange.getDate() !== now.getDate() && now > lastDateChange) {
            OnDateChanged(context);
        }
    }
}
