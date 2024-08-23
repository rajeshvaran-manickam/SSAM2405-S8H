import IsAndroid from '../Common/IsAndroid';
import libPersona from '../Persona/PersonaLibrary';
import QABRedrawExtension from '../QAB/QABRedrawExtension';

export default function FSMOverviewOnPageReturning(context) {
    if (libPersona.isFieldServiceTechnician(context)) {
        let sectionedTable = context.getControls()[0];
        let mapSection = sectionedTable.getSection('MapExtensionSection');

        if (mapSection && mapSection.getVisible() !== false) {
            let mapViewExtension = mapSection.getExtensions()[0];
            if (IsAndroid(context)) {
                mapSection.redraw(true);
            } else {
                mapViewExtension.update();
            }
        }

        let s4MapSection = sectionedTable.getSection('S4MapExtensionSection');
        if (s4MapSection && s4MapSection.getVisible() !== false) {
            let mapViewExtension = s4MapSection.getExtensions()[0];
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
    }
}
