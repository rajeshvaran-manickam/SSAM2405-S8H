
export default function StockLookUpStorageBinPickerItems(context) {
    return context.read(
        '/SAPAssetManager/Services/AssetManager.service',
        'MaterialSLocs',
        [],
        '').then(result => {
            let storageBins = [];
            const jsonResult = [];
            if (result && result.length > 0) {
                for (let i = 0; i < result.length; i++) {
                    if (result.getItem(i).StorageBin) {
                        storageBins.push(result.getItem(i).StorageBin);
                    }
                }
                const uniqueSet = new Set(storageBins.map(item => JSON.stringify(item)));
                let finalResult = [...uniqueSet].map(item => JSON.parse(item));
                for (let j = 0; j < finalResult.length; j++) {
                    jsonResult.push(
                        {
                            'DisplayValue': `${finalResult[j]}`,
                            'ReturnValue': `${finalResult[j]}`,
                        });
                }
            }
            return jsonResult;
        });
    
}
