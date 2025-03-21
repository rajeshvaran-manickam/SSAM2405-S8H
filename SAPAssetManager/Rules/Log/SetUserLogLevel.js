import libCom from '../Common/Library/CommonLibrary';

export default function SetUserLogLevel(context) {
    let logger = context.getLogger();
    try {
        if (context.getValue()) {
            if (context.getValue()[0]) {

                const listPickerValue = context.getValue()[0].ReturnValue;
                if (listPickerValue) {
                    switch (listPickerValue) {
                        case 'Debug':
                            logger.setLevel('Debug');
                            break;
                        case 'Error':
                            logger.setLevel('Error');
                            break;
                        case 'Warn':
                            logger.setLevel('Warn');
                            break;
                        case 'Info':
                            logger.setLevel('Info');
                            break;
                        case 'Trace':
                            logger.setLevel('Trace');
                            break;
                        default:
                            // eslint-disable-next-line no-console
                            console.log(`unrecognized key ${listPickerValue}`);
                    }
                    let dict = libCom.getControlDictionaryFromPage(context);
                    dict.LogCategoriesLstPkr.setEditable(listPickerValue === 'Trace');
                    dict.LogCategoriesLstPkr.setVisible(listPickerValue === 'Trace');
                    return listPickerValue;
                }
            }
        }
    } catch (exception) {
        logger.log(String(exception), 'Error');
        return undefined;
    }
}
