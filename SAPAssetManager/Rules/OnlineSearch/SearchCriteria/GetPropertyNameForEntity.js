import libSearch from '../OnlineSearchLibrary';

export default function GetPropertyNameForEntity(context, propertyType, property) {
    const activeTab = libSearch.getCurrentTabName(context);
    const equipmentTabName = context.getGlobalDefinition('/SAPAssetManager/Globals/OnlineSearch/EquipmentTab.global').getValue();
    const funcLocTabName = context.getGlobalDefinition('/SAPAssetManager/Globals/OnlineSearch/FuncLocTab.global').getValue();
    const filterPropertiesConfig = {
        [equipmentTabName]: {
            FilterProperty: {
                Category: 'EquipCategory',
                ID: 'EquipId',
                Description: 'EquipDesc',
                PlantSection: 'PlantSection',
                WorkCenter: 'MaintWorkCenter',
            },
            EntitySet: {
                Category: 'EquipmentCategories',
            },
            ReturnValue: {
                Category: 'EquipCategory',
            },
            DisplayValue: {
                Category: ['EquipCategory', 'EquipCategoryDesc'],
            },
        },
        [funcLocTabName]: {
            FilterProperty: {
                Category: 'FuncLocCategory',
                ID: 'FuncLocId',
                Description: 'FuncLocDesc',
                PlantSection: 'Section',
                WorkCenter: 'WorkCenter',
            },
            EntitySet: {
                Category: 'FuncLocCategories',
            },
            ReturnValue: {
                Category: 'FuncLocCategory',
            },
            DisplayValue: {
                Category: ['FuncLocCategory', 'FuncLocCategoryDesc'],
            },
        },
    };

    return filterPropertiesConfig[activeTab]?.[propertyType]?.[property];
}
