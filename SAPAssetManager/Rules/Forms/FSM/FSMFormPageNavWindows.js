/* eslint-disable no-mixed-spaces-and-tabs */
import { unzip } from '../ZipUtil';
import Logger from '../../Log/Logger';
import ValidationLibrary from '../../Common/Library/ValidationLibrary';
import libCom from '../../Common/Library/CommonLibrary';
import ApplicationSettings from '../../Common/Library/ApplicationSettings';
import FSMSmartFormsLibrary from './FSMSmartFormsLibraryWindows';
import { GlobalVar } from '../../Common/Library/GlobalCommon';
import IsWindows from '../../Common/IsWindows';

let fieldsInVisibilityRules = {};
let fieldsInCalculations = {};
let fsmFormInstance = null;
let isClosed = false;
let hasCloudID = false;
let isEditable = true;

export default async function FSMFormPageNav(context) {
    let currentChapterIndex = libCom.getStateVariable(context, 'FSMFormInstanceCurrentChapterIndex') || 0;
    let page = context.getPageProxy().getPageDefinition('/SAPAssetManager/Pages/Forms/SingleForm.page');
    if (!ApplicationSettings.hasKey(context, 'XMLTemplateParsed')) { // dont parsed the XML when moving from one chapter to other
        fsmFormInstance = new FSMSmartFormsLibrary();
        let latestBinding = context.getPageProxy().getActionBinding();
        isClosed = latestBinding.Closed;
        hasCloudID = !ValidationLibrary.evalIsEmpty(GlobalVar.getUserSystemInfo().get('FSM_EMPLOYEE'));
        isEditable = !isClosed && hasCloudID;
        libCom.setStateVariable(context, 'CurrentInstanceID', latestBinding.Id);
        currentChapterIndex = ApplicationSettings.getNumber(context, latestBinding.Id + '_lastChapter', currentChapterIndex); //Get the last chapter visited from storage
        libCom.setStateVariable(context, 'FSMFormInstanceCurrentChapterIndex', currentChapterIndex);

        // Read the main blob that contains all xmls
        const FSMMetaData = await getFSMEntitySet(context).then((blob) => {
            return blob;
        }).catch((err) => {
            Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
        });

        // Read the values.xml
        let valuesFolder = await unZipFormContent(context, latestBinding.Content, latestBinding.Id, 'values')
        .catch((err) => {
            Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
        });
        libCom.setStateVariable(context, 'ChapterValuesFilePath', valuesFolder);

        /*
        * This method takes in the base64 encoding of a Template's content and writes that
        * file (with file name as the Tempalate ID) to a temporary folder.
        */
        let templateFolder = await unZipFormContent(context, FSMMetaData.Content, latestBinding.Id, 'template')
        .catch((err) => {
            Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
        });
        
        try {
            /* parse container_metadata.xml file */
            const xmlParserModule = context.mdkWindows.xmlParserModule;
            let container_metadata_path = context.nativescript.fileSystemModule.path.join(templateFolder, 'container_metadata.xml');
            

            await context.mdkWindows.xmlParserModule.convertXmlFileToJsonObject(container_metadata_path).then(res => {
                fsmFormInstance.parseMetadata = res;
            }).catch(err => {
                Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
            });

            libCom.setStateVariable(context, 'instanceLanguage', fsmFormInstance.langaugeCode || 'en');

            /* parse translations-en.xml file */
            let translation_path = context.nativescript.fileSystemModule.path.join(templateFolder, FSMSmartFormsLibrary.getLocalizeFileName(context, templateFolder, 'translations'));
            

            
            let template_path = context.nativescript.fileSystemModule.path.join(templateFolder, 'template.xml');
            

            /* parse values.xml file */
            let values_path = context.nativescript.fileSystemModule.path.join(valuesFolder, FSMSmartFormsLibrary.getLocalizeFileName(context, valuesFolder, 'values-1'));
           
            fsmFormInstance.chapters = [];
            
            /* parse translations-en.xml file */
            await context.mdkWindows.xmlParserModule.convertXmlFileToJsonObject(translation_path).then(res => {
                fsmFormInstance.translations(res,fsmFormInstance.translatedFields);
            }).catch(err => {
                Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
            });

            /* parse values.xml file */
            await xmlParserModule.convertXmlFileToJsonObject(values_path).then(res => {
                fsmFormInstance.valuesObj(res,fsmFormInstance.userValues);
            }).catch(err => {
                Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
            });

            /* parse template.xml file */
            await xmlParserModule.convertXmlFileToXmlString(template_path).then(xmlString => {
                fsmFormInstance.parseXMLIntoChapterFieldOrder(xmlString.replace(/[\t\n\r]/gm,''), context); //Parse the XML after removing formatting characters
            });
            await xmlParserModule.convertXmlFileToJsonObject(template_path).then(res => {
                fsmFormInstance.template(res, fsmFormInstance.translatedFields, fsmFormInstance.userValues, fsmFormInstance.calculationRules, fsmFormInstance.visibilityRules);
            }).catch(err => {
                Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
            });

            saveTemplateState(context); // Save template states so we can use it for populating the control
        } catch (err) {
            Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
        }
    }

    /* create a section for chapter picker */
    page.Controls[0].Sections.push({
        '_Type': 'Section.Type.FormCell',
        '_Name': 'SectionChapterPicker',
        'Controls': [{
            '_Name': 'ChapterListPicker',
            'Caption': '/SAPAssetManager/Rules/Forms/FSM/ChapterPickerCaption.js',
            'Value': '/SAPAssetManager/Rules/Forms/FSM/ChapterPickerValue.js',
            '_Type': 'Control.Type.FormCell.ListPicker',
            'AllowMultipleSelection': false,
            'IsEditable': true,
            'IsPickerDismissedOnSelection': true,
            'AllowEmptySelection': false,
            'PickerItems': '/SAPAssetManager/Rules/Forms/FSM/ChapterPickerItems.js',
            'OnValueChange': '/SAPAssetManager/Rules/Forms/FSM/ChapterPickerOnValueChange.js',
        }],
    });
    fieldsInVisibilityRules = libCom.getStateVariable(context, 'FSMFormInstanceControlsInVisibilityRules');
    fieldsInCalculations = libCom.getStateVariable(context, 'FSMFormInstanceControlsInCalculations');
    let valueMap = libCom.getStateVariable(context, 'FSMFormInstanceControls');
    //Reset the Attachments State Variable whenever a new form instance is opened
    if (!ValidationLibrary.evalIsEmpty(libCom.getStateVariable(context, 'Attachments'))) {
        libCom.removeStateVariable(context, 'Attachments');
    }

    /* iterate all objects in the chapters array and map the fields of all the chapters to mdk control */
    /* fields of the chapters will be pushed to the Controls array of the Section created below */
    page.Controls[0].Sections.push({
        '_Type': 'Section.Type.FormCell',
        'Controls': [],
    });

    let chapters = libCom.getStateVariable(context, 'FSMFormInstanceChapters');
    let chapter = chapters[chapters.findIndex((row) => row.index === currentChapterIndex)];
    if (chapter.state === 0) { //Set to visited for this editing instance.  We do not persist visited when form is closed
        chapter.state = 1;
        chapter.hasBeenVisited = true;
    }

    for (let d = 0; d < fsmFormInstance.chapters[currentChapterIndex].fields.length; d++) { //Create the page controls for current chapter
        let visibilityRule = '';
        let sigCaption = '';
        let requiredCaption = '';
        const tempField = fsmFormInstance.chapters[currentChapterIndex].fields[d];

        if (Object.prototype.hasOwnProperty.call(fieldsInVisibilityRules,tempField.elementID) || Object.prototype.hasOwnProperty.call(fieldsInCalculations,tempField.elementID)) { //Does this field exist in any visibility rules or calculations?
            visibilityRule = '/SAPAssetManager/Rules/Forms/FSM/FSMFormFieldOnValueChange.js';
        }
        if (tempField.type === 'textinput' && tempField.multiline === 'true') {
            tempField.type = 'note';
        }
        if (tempField.required === 'true') {
            requiredCaption = ' *';
        }
        let sectionsLength = page.Controls[0].Sections.length;
        switch (tempField.type) {
            case 'numberinput':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': tempField.name + requiredCaption,
                    'PlaceHolder': '',
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'Value': valueMap[tempField.elementID].Value,
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'KeyboardType': 'Number',
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'textinput':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': tempField.name + requiredCaption,
                    'PlaceHolder': '',
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'Value': valueMap[tempField.elementID].Value,
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'OnValueChange': visibilityRule,
                    'BarcodeScanner': tempField.allowBarcode === 'true',
                    'KeyboardType': 'Default',
                    'IsVisible': true,
                });
                break;
            case 'note':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': '',
                    'Value': tempField.name + requiredCaption,
                    '_Name': tempField.elementID + 'Caption',
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'IsEditable': false,
                });
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': tempField.name + requiredCaption,
                    'PlaceHolder': '',
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'Value': valueMap[tempField.elementID].Value,
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.Note',
                    'OnValueChange': visibilityRule,
                    'KeyboardType': 'Default',
                    'IsVisible': true,
                    'IsAutoResizing': false,
                });
                break;
            case 'label':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': tempField.valueExtra,
                    'PlaceHolder': '',
                    'IsEditable': false,
                    'Value': '',
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'boolinput':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.Switch',
                    '_Name': tempField.elementID,
                    'Caption': tempField.name,
                    'Value': valueMap[tempField.elementID].Value,
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'dropdown':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.ListPicker',
                    '_Name': tempField.elementID,
                    'IsPickerDismissedOnSelection': true,
                    'AllowMultipleSelection': false,
                    'IsSelectedSectionEnabled': true,
                    'AllowEmptySelection': true,
                    'PickerItems': tempField.options,
                    'PickerPrompt': 'Choose option',
                    'Caption': tempField.name + requiredCaption,
                    'Value': valueMap[tempField.elementID].Value,
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'FilterProperty': 'Priority',
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'dateinput':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.DatePicker',
                    '_Name': tempField.elementID,
                    'Caption': tempField.name + requiredCaption,
                    'Value': valueMap[tempField.elementID].Value,
                    'Mode': tempField.coreType,
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'attachment':
            if (!ValidationLibrary.evalIsEmpty(valueMap[tempField.elementID].Value) && FSMSmartFormsLibrary.isValidUUID(valueMap[tempField.elementID].Value)) {
                FSMSmartFormsLibrary.getMediaControl(page, valueMap, tempField);
            }
            break;
            case 'attachmentPicker':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.Attachment',
                    'Caption': tempField.name + requiredCaption,
                    'AttachmentTitle': tempField.name + '\xa0(%d)\xa0' + requiredCaption,
                    'AttachmentAddTitle': '$(L,add)',
                    'AttachmentActionType': attachmentPickerActionType(tempField.allowedTypes),
                    'AllowedFileTypes': attachmentPickerFileType(tempField.allowedTypes),
                    'Value': await attachmentPickerValue(context, valueMap, tempField),
                    'IsVisible': true,
                });
                //Button to trigger downloads if FSMInstance already has attachments via FSM Board
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.Button',
                    'ButtonType': 'Text',
                    'Semantic': 'Tint',
                    '_Name': tempField.elementID + 'DownloadButton',
                    'IsVisible':  FSMFormAttachmentPickerDownloadButtonVisible(context, valueMap, tempField),
                    'OnPress': '/SAPAssetManager/Rules/Forms/FSM/FSMFormAttachmentPickerDownloadAttachments.js',
                    'Title': FSMFormAttachmenPickerDownloadButtonValue(context, valueMap, tempField),
                });
                break;
            case 'signature':
                sigCaption = '$(L, add_signature)';
                if (!ValidationLibrary.evalIsEmpty(valueMap[tempField.elementID].Value) && FSMSmartFormsLibrary.isValidUUID(valueMap[tempField.elementID].Value)) {
                    FSMSmartFormsLibrary.getMediaControl(page, valueMap, tempField);
                    sectionsLength = page.Controls[0].Sections.length;
                    sigCaption = '$(L, forms_replace_signature)';
                }

                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.InlineSignatureCapture',
                    '_Name': tempField.elementID,
                    'Caption': sigCaption + requiredCaption,
                    'ShowTimestampInImage': true,
                    'ShowXMark': true,
                    'ShowUnderline': true,
                    'TimestampFormatter': 'MM/dd/yy hh:mm a zzz',
                    'HelperText': tempField.name,
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            case 'stateElement':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    '_Type': 'Control.Type.FormCell.ListPicker',
                    '_Name': tempField.elementID + '.value',
                    'AllowMultipleSelection': false,
                    'AllowEmptySelection': true,
                    'PickerItems': FSMSmartFormsLibrary.getStatusForMachines(),
                    'PickerPrompt': 'Choose option',
                    'Caption': tempField.name + requiredCaption,
                    'Value': ValidationLibrary.evalIsNumeric(valueMap[tempField.elementID].Value.Value) ? FSMSmartFormsLibrary.getStatusForMachines()[valueMap[tempField.elementID].Value.Value]: '',
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                    'IsPickerDismissedOnSelection': true,
                });
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': 'Comment' + requiredCaption,
                    'Value': valueMap[tempField.elementID].Value.Comment,
                    '_Name': tempField.elementID + '.comment',
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                    'IsEditable': isEditable && (tempField.readOnly === 'false' || !tempField.readOnly),
                });
                break;
            case 'calculation':
                page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                    'Caption': tempField.name,
                    'PlaceHolder': '',
                    'IsEditable': false,
                    'Value': '',
                    '_Name': tempField.elementID,
                    '_Type': 'Control.Type.FormCell.SimpleProperty',
                    'OnValueChange': visibilityRule,
                    'IsVisible': true,
                });
                break;
            /**
            case 'safetyLabel':
                 page.Controls[0].Sections[sectionsLength - 1].Controls.push({
                     '_Type': 'Control.Type.FormCell.Extension',
                    '_Name': tempField.elementID,
                    'Module': 'SafetyLabelModule',
                    'Control': 'SafetyLabelExtension',
                    'Class': 'SafetyLabelClass',
                    'ExtensionProperties':
                    {
                        'signalWord': tempField.signalWord,
                        'symbolLeft': tempField.symbolLeft,
                        'symbolRight': tempField.symbolRight,
                        'descriptionCaption': tempField.valueExtra,
                        'headerCaption': getSafetyLabelHeaderCaption(context, tempField.signalWord),
                    },
                });
                break;
            */
            default:
                Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), 'Unknown control type: ' + tempField.type + ' name ' + tempField.name + ' elementId: ' + tempField.elementID);
                break;
        }
    }

    let NewActionBinding = FSMSmartFormsLibrary.getFormActionBinding(context);
    context.getPageProxy().setActionBinding(NewActionBinding);

    /* Open the Empty page with the above controls */
    return context.executeAction({
        'Name': '/SAPAssetManager/Actions/Forms/NavFormPage.action',
        'Properties': {
            'PageMetadata': page,
            'PageToOpen': '/SAPAssetManager/Pages/Forms/Empty.page',
            'ClearHistory': true,
            'Transition': {
                'Name': 'None',
            },
        },
        'Type': 'Action.Type.Navigation',
    });
}

/*
* Method to get the FSM TemplateEnitity set and returns the Template Entity
*/
function getFSMEntitySet(context) {

    let idClause = '';
    let latestBinding = FSMSmartFormsLibrary.getFormActionBinding(context);
    if (!ValidationLibrary.evalIsEmpty(latestBinding) && !ValidationLibrary.evalIsEmpty(latestBinding.Template)) {
        idClause = `('${latestBinding.Template}')`;
        return context.read('/SAPAssetManager/Services/AssetManager.service', `FSMFormTemplates${idClause}`, [], '').then(result => {
            if (result && result.getItem(0)) {
                return result.getItem(0);
            }
            return '';
        });
    }
    return '';
}

/*
* This method takes in a base64 encoding of a zip file, as well as the
* name of the new zipped file and writes thta to a temporary file.
* This portion was written with Mac and for IOS.
*/
async function  unZipFormContent(context, encodedContent, instanceId, idenfier ) {
    const zippedContent = await base64Decode(context, encodedContent);
    const fileName = idenfier + '-' + instanceId;
    const fileExtension = '.zip';
    const fullFileName = fileName + fileExtension;
    const zipPath = context.nativescript.fileSystemModule.path.join(context.nativescript.fileSystemModule.knownFolders.temp().path, fullFileName);
    const zipFile = context.nativescript.fileSystemModule.File.fromPath(zipPath);
    //         // create the folder
    await zipFile.write(zippedContent);
    const zipDest =  context.nativescript.fileSystemModule.path.join(context.nativescript.fileSystemModule.knownFolders.temp().path, fileName);
    const zipFolder = context.nativescript.fileSystemModule.Folder.fromPath(zipDest);
    await zipFolder.clear();
    try {
        await unzip(context, zipPath, zipDest);
    } catch (err) {
        Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
    }
    return zipDest;
}

async function base64Decode(context, encodedContent) {
    let zippedContent = null;

    if (context.nativescript.platformModule.IsAndroid) {
        // eslint-disable-next-line no-undef
        zippedContent = android.util.Base64.decode(encodedContent,android.util.Base64.DEFAULT);
    } else if (context.nativescript.platformModule.isIOS) {
        // eslint-disable-next-line no-undef
        zippedContent = NSData.alloc().initWithBase64EncodedStringOptions(encodedContent, 0);
    } else {
        //Handle windows
        zippedContent = context.mdkWindows.conversionModule.decodeBase64ToArrayBuffer(encodedContent);  
    }

    return zippedContent;
}

/**
 * Persist data for this instance/template after parsing XML
 * Data is used to process visibility rules based on data entry, validation, saving back to XML, etc...
 * @param {*} context
 */
function saveTemplateState(context) {
    let chapterArray = []; //Keep track of all chapters and their visibility state
    let fields = {};
    let chapterIndex = 0;
    let extra = '';
    const validControlTypes = FSMSmartFormsLibrary.getSupportedSmartformControls(context);
    fieldsInVisibilityRules = {};
    fieldsInCalculations = {};

    try {
        ApplicationSettings.setBoolean(context, 'XMLTemplateParsed', true);
        fsmFormInstance.chapters.forEach(tempChapter => {
            let chapterObject = {};
            chapterObject.id = tempChapter.elementID;
            chapterObject.name = tempChapter.chapterName;
            chapterObject.index = chapterIndex;
            chapterObject.isVisible = true;
            chapterObject.isSubChapter = tempChapter.isSubChapter;
            chapterObject.state = 0;
            chapterObject.oldState = 0;
            chapterObject.hasBeenVisited = false;
            chapterArray.push(chapterObject);
            chapterIndex++;
            tempChapter.fields.forEach(tempField => {
                let control = {};
                let value = '';
                let tempOption = '';
                let selectedIndex;

                if (!validControlTypes[tempField.type]) {
                    return; //Only process supported control types
                }

                control.Name = tempField.elementID;
                control.Type = tempField.type;
                control.NeedsXMLUpdate = false;
                control.Required = tempField.required === 'true';
                control.Min = tempField.min;
                control.Max = tempField.max;
                control.AllowOutOfRangeValues = tempField.allowOutOfRangeValues === 'true';
                control.MinDecimals = tempField.minDecimals;
                control.MaxDecimals = tempField.maxDecimals;
                control.ChapterIndex = chapterObject.index;
                control.Chapter = chapterObject;
                control.IsVisible = true;
                control.IsInvalidCalculation = false;
                control.CalculationError = '';
                control.IsError = false;

                switch (control.Type) {
                    case 'numberinput':
                        value = fsmFormInstance.userValues.has(tempField.elementID) ? fsmFormInstance.userValues.get(tempField.elementID) : tempField.value;
                        break;
                    case 'textinput':
                    case 'note':
                    case 'dateinput':
                    case 'signature':
                    case 'calculation':
                        value = fsmFormInstance.userValues.has(tempField.elementID) ? fsmFormInstance.userValues.get(tempField.elementID) : tempField.value;
                        control.FileContent = '';
                        break;
                    case 'attachment':
                    case 'attachmentPicker':
                        control.attachmentName = fsmFormInstance.userValues.has(tempField.elementID) ? fsmFormInstance.userValues.get(tempField.elementID) : '';
                        value = fsmFormInstance.userValues.has(tempField.elementID) ? fsmFormInstance.userValues.get(tempField.elementID) : '';
                        break;
                    case 'label':
                        value = tempField.name;
                        break;
                    case 'boolinput':
                        value = fsmFormInstance.userValues.has(tempField.elementID) ? 'true' === fsmFormInstance.userValues.get(tempField.elementID) : tempField.value === 'true';
                        break;
                    case 'dropdown': //Smartforms use the selectedindex of the picker option as the stored value
                        selectedIndex = tempField.selectedIndex;
                        if (ValidationLibrary.evalIsNumeric(selectedIndex)) {
                            selectedIndex = Number(selectedIndex);
                            if (selectedIndex > -1) {
                                let option = tempField.options[tempField.options.findIndex((row) => row.Index === selectedIndex)];
                                if (option) {
                                    tempOption = option;
                                }
                            }
                        }
                        if (IsWindows(context)) { //Windows stores userValues differently
                            extra = '.value';
                        }
                        if (fsmFormInstance.userValues.has(tempField.elementID + extra)) {
                            if (ValidationLibrary.evalIsNumeric(fsmFormInstance.userValues.get(tempField.elementID + extra))) {
                                value = tempField.options[Number(fsmFormInstance.userValues.get(tempField.elementID + extra))].ReturnValue;
                            } 
                        } else {
                            value = tempOption.ReturnValue;
                        }
                        control.Options = {};
                        for (let j=0; j < tempField.options.length; j++) { //Save these options for visibility checks
                            control.Options[tempField.options[j].ReturnValue] = tempField.options[j];
                        }
                        break;
                    case 'stateElement':
                        value = {
                            'Value': fsmFormInstance.userValues.has(tempField.elementID + 'value') ? fsmFormInstance.userValues.get(tempField.elementID + 'value') : tempField.selectedIndex,
                            'Comment': fsmFormInstance.userValues.has(tempField.elementID + 'comment') ? fsmFormInstance.userValues.get(tempField.elementID + 'comment') : tempField.value,
                        };
                        // By default all control have @localized value and if there is no corresponding
                        // section for them in values.xml or translations.xml, we show empty
                        value.Value = value.Value === '@localized' ? '' : value.Value;
                        if (ValidationLibrary.evalIsNumeric(value.Value)) {
                            value.Value = Number(value.Value);
                        }
                        value.Comment = value.Comment === '@localized' ? '' : value.Comment;
                        break;
                    default: //safetyLabel can be ignored?
                        break;
                }
                control.Value = value === '@localized' ? '' : value;
                fields[control.Name] = control;
                saveElementsInRules(control.Name);
                saveElementsInCalculations(control.Name);
            });
        });
        libCom.setStateVariable(context, 'FSMFormInstanceControls', fields);
        libCom.setStateVariable(context, 'FSMFormInstanceVisibilityRules', fsmFormInstance.visibilityRules);
        libCom.setStateVariable(context, 'FSMFormInstanceCalculationRules', fsmFormInstance.calculationRules);
        libCom.setStateVariable(context, 'FSMFormInstanceControlsInVisibilityRules', fieldsInVisibilityRules);
        libCom.setStateVariable(context, 'FSMFormInstanceControlsInCalculations', fieldsInCalculations);
        FSMSmartFormsLibrary.SetInitialChapterAndFieldVisibilityState(context, chapterArray); //Run visibility rules so the page has chapter visibility for extension and chapter picker
        libCom.setStateVariable(context, 'FSMFormInstanceChapters', chapterArray);
        FSMSmartFormsLibrary.checkInvalidCalculations(context); //Validate that calculations do not have cyclic references
    } catch (err) {
        Logger.error(context.getPageProxy().getGlobalDefinition('/SAPAssetManager/Globals/Forms/FSM/FSMForm.global').getValue(), `Error: ${err.message}`);
    }
}

/**
 * Save field names that are needed for rules
 * @param {*} context
 */
function saveElementsInRules(fieldName) {
    const pattern = new RegExp('\\b(' + fieldName + ')\\b', 'i'); //ig

    if (!Object.prototype.hasOwnProperty.call(fieldsInVisibilityRules,fieldName)) { //Already found this field in a rule
        for (const control in fsmFormInstance.visibilityRules) { //Loop over all visibility rules
            if (fsmFormInstance.visibilityRules[control].Rule.match(pattern)) {  //Does this field exist in visibilty rule criteria?
                fieldsInVisibilityRules[fieldName] = true;
                return;
            }
        }
    }
}

/**
 * Save field names that are needed for calculations
 * @param {*} context
 */
 function saveElementsInCalculations(fieldName) {
    const pattern = new RegExp('\\b(' + fieldName + ')\\b', 'i'); //ig

    if (!Object.prototype.hasOwnProperty.call(fieldsInCalculations,fieldName)) { //Already found this field in a calculation
        for (const control in fsmFormInstance.calculationRules) { //Loop over all calculations
            if (fsmFormInstance.calculationRules[control].Rule.match(pattern)) {  //Does this field exist in calculation rule criteria?
                fieldsInCalculations[fieldName] = true;
                return;
            }
        }
    }
}

/**
 * Helper function to determine action type of attachment allowed based on allowedTypes
 * @param {*} allowedTypes
 */
function attachmentPickerActionType(allowedTypes) {
    let types = [];
    if ('PNG,TIFF,GIF,JPG,JPEG,TIF,BMP,ICO' === allowedTypes) {
        types.push('AddPhoto');
        types.push('TakePhoto');
    } else if ('MOV,3GP,M4V,MP4' === allowedTypes) {
        types.push('SelectFile');
    } else if ('*' === allowedTypes) {
        types.push('AddPhoto');
        types.push('TakePhoto');
        types.push('SelectFile');
    }
    return types;
}

/**
 * Helper function to determine file type of attachment allowed based on allowedTypes
 * @param {*} allowedTypes
 */
function attachmentPickerFileType(allowedTypes) {
    let types = [];
    if ('PNG,TIFF,GIF,JPG,JPEG,TIF,BMP,ICO' === allowedTypes) {
        types.push('PNG');
        types.push('TIFF');
        types.push('GIF');
        types.push('JPG');
        types.push('JPEG');
        types.push('TIF');
        types.push('BMP');
        types.push('ICO');
    } else if ('MOV,3GP,M4V,MP4' === allowedTypes) {
        types.push('MOV');
        types.push('3GP');
        types.push('M4V');
        types.push('MP4');
    } else if ('*' === allowedTypes) {
        return types;
    }
    return types;
}

//Helper Function to set inital values of attachment picker
function attachmentPickerValue(context, valueMap, tempField) {
    //array to hold FSMAttachment ids
    let attachmentData = [];
    //array to hold attachment pickers + ids
    let attachmentObject = [];
    //set initial values for attachment picker
    for (let x = 0; x < valueMap[tempField.elementID].Value.length; x++) {
        if (!ValidationLibrary.evalIsEmpty(valueMap[tempField.elementID].Value[x]) && FSMSmartFormsLibrary.isValidUUID(valueMap[tempField.elementID].Value[x])) {
            const id = valueMap[tempField.elementID].Value[x].replace(/[^A-Za-z0-9]+/g, '');
            attachmentData.push(id);
            //only if the attachment does not exist locally, we want to save picker + id for future use to download
            if (!FSMSmartFormsLibrary.ifMediaExist(context, id)) {
                attachmentObject.push(valueMap[tempField.elementID].Name + ',' + id);
            }
        }
    }
    //set state variable to keep track of attachment descriptions if applicable
    //contents of this variable is an object with ID/Description pairs
    //example: {1adeebde9413:1adeebde9413.jpg, tt93jfnu3ifjwuf:tt93jfnu3ifjwuf.png}
    //this state variable is used to visualize the attachments on page load
    let descriptionArray = [];
    for (let y = 0; y < attachmentData.length; y++) {
        let id = attachmentData[y];
        if (FSMSmartFormsLibrary.ifMediaExist(context, id)) {
            //we don't have description, so we must read it from udb
            descriptionArray.push(context.read('/SAPAssetManager/Services/AssetManager.service', 'FSMFormAttachments', [], "$filter= DocumentId eq '" + id + "'").then(fsmfilename => {
                return {[fsmfilename._array[0].DocumentId]: fsmfilename._array[0].Description};
            }));
        }
    }
    return Promise.all(descriptionArray).then(data => {
        let attachmentDescription = Object.assign({}, ...data);
        let attachmentDescriptionStateVariable = libCom.getStateVariable(context, 'AttachmentDescriptions');
        if (attachmentDescriptionStateVariable) {
            attachmentDescription = {...attachmentDescriptionStateVariable, ...attachmentDescription};
        }
        libCom.setStateVariable(context, 'AttachmentDescriptions', attachmentDescription);
        //set state variable to track attachments to their pickers
        //The contents of the variable is an array of picker to id.
        //example: ['attachmentPicker1,1adeebde9413', 'attachmentPicker2,tt93jfnu3ifjwuf', ...]
        //This is used during the download process since we do not know which attachments belong to which pickers without it
        let stateVariable = libCom.getStateVariable(context, 'Attachments');
        if (stateVariable) {
            //append to existing stateVariable
            let concatArray = stateVariable.concat(attachmentObject);
            libCom.setStateVariable(context, 'Attachments', concatArray);
            return attachmentData;
        }
        libCom.setStateVariable(context, 'Attachments', attachmentObject);
        return attachmentData;
    }).catch(() => {
        //set state variable to track attachments to their pickers
        //The contents of the variable is an array of picker to id.
        //example: ['attachmentPicker1,1adeebde9413', 'attachmentPicker2,tt93jfnu3ifjwuf', ...]
        //This is used during the download process since we do not know which attachments belong to which pickers without it
        let stateVariable = libCom.getStateVariable(context, 'Attachments');
        if (stateVariable) {
            //append to existing stateVariable
            let concatArray = stateVariable.concat(attachmentObject);
            libCom.setStateVariable(context, 'Attachments', concatArray);
            return attachmentData;
        }
        libCom.setStateVariable(context, 'Attachments', attachmentObject);
        return attachmentData;
        });
}

/**
* Visibility rule for FSM Form Attachment Picker
* Show only if Attachment Picker has existing attachments that can be downloaded
*/
function FSMFormAttachmentPickerDownloadButtonVisible(context, valueMap, tempField) {
    for (let x = 0; x < valueMap[tempField.elementID].Value.length; x++) {
        const id = valueMap[tempField.elementID].Value[x].replace(/[^A-Za-z0-9]+/g, '');
        if (!FSMSmartFormsLibrary.ifMediaExist(context,id)) {
            return true;
        }
    }
    return false;
}

/**
* Display the amount of attachments you can download from backend for this picker
*/
function FSMFormAttachmenPickerDownloadButtonValue(context, valueMap, tempField) {
    let counter = 0;
    for (let i = 0; i < valueMap[tempField.elementID].Value.length; i++) {
        let id = valueMap[tempField.elementID].Value[i].replace(/[^A-Za-z0-9]+/g, '');
        if (!FSMSmartFormsLibrary.ifMediaExist(context, id)) {
            counter++;
        }
    }
    return '$(L,forms_download)' + '\xa0(' + counter + ')';
}

