import libVal from '../../Common/Library/ValidationLibrary';

export default function InspectionLotKPIValueForCharacteristics(context) {
    if (Object.prototype.hasOwnProperty.call(context.binding,'InspectionChars_Nav') && !libVal.evalIsEmpty(context.binding.InspectionChars_Nav)) {
        let chars = context.binding.InspectionChars_Nav;
        let nonEmpty = 0;
        for (let i = 0; i < chars.length; i++) {
            if (!libVal.evalIsEmpty(chars[i].Valuation )) {
                nonEmpty++;
            }
        }
        return nonEmpty + '/' + chars.length;
    }
    return '0/0';
}
