import NotificationAddTextButton from '../Common/ChangeSet/NotificationAddTextButton';

export default function MapNotificationCreate(context) {
    const extension = context.getControl('MapExtensionControl')._control;
    if (extension) {
        const json = {
            EditModeConfig: {
                EditModePanel: {
                    GeometryTypes: ['Point', 'Polyline', 'Polygon'],
                    TitleText: 'action_create_notif',
                    SaveButtonText: NotificationAddTextButton(context),
                    Symbol: {
                        marker : 'MarkerNotification',
                        styleWidth : 24,
                        styleHeight : 24,
                        lineColor : '04ACA7',
                        fillColor : '04ACA733',
                        lineWidth : 2,
                        yOffset : 0,
                        xOffset : 0,
                    },
                },
                CallbackInfo: {
                    Action: '/SAPAssetManager/Rules/Notifications/CreateUpdate/NotificationCreateFromMap.js',
                    Target: {
                        EntitySet: 'MyNotificationHeaders',
                        Service: '/SAPAssetManager/Services/AssetManager.service',
                        QueryOptions: '$filter=false',
                        Properties: [],
                        KeyProperties: [],
                    },
                },
            },
        };
        extension.enterEditMode(json);
    }
}
