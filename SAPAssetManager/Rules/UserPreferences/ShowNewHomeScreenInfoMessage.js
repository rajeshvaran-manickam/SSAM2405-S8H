import libPersona from '../Persona/PersonaLibrary';

/**
* Executes message action with info that new home screen layout is being used by default after intial sync/app update
* @param {IClientAPI} clientAPI
*/
export default function ShowNewHomeScreenInfoMessage(context) {
    if (libPersona.isNewHomeScreenEnabled(context)) {
        return context.executeAction('/SAPAssetManager/Actions/NewHomeScreenInfoMessage.action');
    }
}
