import CommonLibrary from '../../Common/Library/CommonLibrary';
import QuantityInBaseUOM from '../../Inventory/IssueOrReceipt/QuantityInBaseUOM';
import ShowQuantityInBaseUOM from './ShowQuantityInBaseUOM';
export default function OnUOMQuantityChange(context) {
    CommonLibrary.clearValidationOnInput(context);
    const quantity = context.getPageProxy().getControl('FormCellContainer').getControl('BaseQuantityUOM');
    return QuantityInBaseUOM(context).then(results => {
        quantity.setValue(results);
        return ShowQuantityInBaseUOM(context).then(visible => {
            quantity.setVisible(visible);
        });
    });
}
