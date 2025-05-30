import { Application } from '@nativescript/core';

export let LabelButton;
let LabelButtonModule;
/*
This is a sample of how to implement iOS and Android codes separately in a metadata extension.
Because all ts files in metadata Extensions folder will be bundled together using webpack,
if you execute any iOS codes in Android vice versa, it will likely cause issue such as crash.

By splitting the implementation into different files and encapsulate them in a function, it allows
us to load only the required module for the platform at runtime.
*/
if (!LabelButton) {
    //Here you will check what platform the app is in at runtime.
    if (Application.ios) {
        //if app is in iOS platform, load the LabelButton module from ios folder
        LabelButtonModule = require('./ios/LabelButton');
    } else {
        //otherise, assume app is in Android platform, load the LabelButton module from android folder
        LabelButtonModule = require('./android/LabelButton');
    }
    // calling GetLabelButtonClass() will return LabelButton class for the correct platform.
    //  See the LabelButton.ts in ios/android folder for details
    LabelButton = LabelButtonModule.GetLabelButtonClass();
}
