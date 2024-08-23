import { PI_NOT_COUNTED_FILTER } from './PhysicalInventoryCountNavWrapper';

export default function PhysicalInventoryCountAllIsAllowed(context) {
    let binding = context.getPageProxy().getActionBinding();
    const orderBy = 'Item';
    const expand = 'MaterialPlant_Nav,PhysicalInventoryDocHeader_Nav';
    const sharedQuery = `PhysInvDoc eq '${binding.PhysInvDoc}' and FiscalYear eq '${binding.FiscalYear}'`;
    const baseQuery = `${sharedQuery} and ${PI_NOT_COUNTED_FILTER}`;
    let query = `$filter= ${baseQuery}&$orderby=${orderBy}&$top=1&$expand=${expand}`;
    return context.count('/SAPAssetManager/Services/AssetManager.service', 'PhysicalInventoryDocItems', query).then(function(count) {
        return count > 0;
    });
}

