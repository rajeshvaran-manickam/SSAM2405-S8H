import ConvertDoubleToHourString from '../Confirmations/ConvertDoubleToHourString';
import {TimeSheetLibrary as libTS} from './TimeSheetLibrary';
import libCrew from '../Crew/CrewLibrary';

export default function TimeSheetDetailsTotalHours(context) {
    let date = context.getPageProxy().binding.Date;
    if (libCrew.isCrewFeatureEnabled(context)) {
        return calculateHours(context);
    } else {
        return context.read('/SAPAssetManager/Services/AssetManager.service', 'CatsTimesheets', [], "$filter=Date eq datetime'" + date + "'").then(function(timeEntries) {
            return calculateHours(context, timeEntries);
        });
    }


}
export function calculateHours(context, timeEntries = context.binding) {
    let hours = 0.0;
    timeEntries.forEach(function(element) {
        hours += libTS.getActualHours(context, element.Hours);
    });
    return ConvertDoubleToHourString(hours);

}
