import mobileStatusOverride from '../../MobileStatus/MobileStatusUpdateOverride';
import common from '../../Common/Library/CommonLibrary';
import libOpMobile from './OperationMobileStatusLibrary';
import MobileStatusLibrary from '../../MobileStatus/MobileStatusLibrary';
import libSuper from '../../Supervisor/SupervisorLibrary';
import libClock from '../../ClockInClockOut/ClockInClockOutLibrary';
import isAssignEnableWorkOrderOperation from '../../Operations/MobileStatus/IsAssignEnableWorkOrderOperation';
import isUnAssignEnableWorkOrderOperation from '../../Operations/MobileStatus/IsUnAssignEnableWorkOrderOperation';
import personaLib from '../../Persona/PersonaLibrary';
import Logger from '../../Log/Logger';
import PhaseLibrary from '../../PhaseModel/PhaseLibrary';
import WorkOrderCompletionLibrary from '../../WorkOrders/Complete/WorkOrderCompletionLibrary';
import libVal from '../../Common/Library/ValidationLibrary';
import IsPhaseModelEnabled from '../../Common/IsPhaseModelEnabled';

export default function OperationChangeStatusOptions(context, actionBinding) {
    const READY = 'READY'; // Don't bother adding this to the config panel. EAM Team needs to fix their hardcoded app transitions first. See TODO below.
    const RECEIVED = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReceivedParameterName.global').getValue());
    const STARTED = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/StartParameterName.global').getValue());
    const HOLD = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/HoldParameterName.global').getValue());
    const COMPLETE = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/CompleteParameterName.global').getValue());
    const TRANSFER = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/TransferParameterName.global').getValue());
    const REVIEW = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReviewParameterName.global').getValue());
    const REJECTED = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());
    const APPROVE = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ApproveParameterName.global').getValue());
    const DISAPPROVE = common.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/DisapproveParameterName.global').getValue());
    const cicoEnabled = libClock.isCICOEnabled(context);

    const binding = actionBinding || context.binding;

    /**
     * Checks for supervisor feature enablement and returns role if applicable
     * @returns {Promise<String>} 'T' if Technician, 'S' if Supervisor or feature disabled
     */
     let roleCheck = function() {
        const supervisorEnabled = libSuper.isSupervisorFeatureEnabled(context);

        if (supervisorEnabled) {
            return libSuper.isUserTechnician(context).then(isTechnician => {
                if (isTechnician) {
                    return 'T';
                }
                return 'S';
            });
        } else {
            // Supervisor isn't enabled
            return Promise.resolve('S');
        }
    };

    const assnType = common.getWorkOrderAssignmentType(context);
    // If header level assignment, only allow confirm/unconfirm. Otherwise, do the whole mobile status shebang.
    if (assnType === '1' || assnType === '5' || assnType === '7' || assnType === '8') {
        let workOrderMobileStatus = MobileStatusLibrary.getMobileStatus(binding.WOHeader, context);
        if (workOrderMobileStatus === STARTED) {
            return MobileStatusLibrary.isMobileStatusConfirmed(context, binding).then(result => {
                if (result) {
                    return [{'Title': context.localizeText('unconfirm'), 'OnPress': '/SAPAssetManager/Rules/Operations/MobileStatus/OperationUnconfirmStatus.js'}];
                } else {
                    return [{'Title': context.localizeText('confirm'), 'OnPress': '/SAPAssetManager/Rules/Operations/MobileStatus/OperationConfirmStatus.js'}];
                }
            });
        }
        context.dismissActivityIndicator();
        return Promise.resolve([]);
    } else {
        return Promise.all([libOpMobile.isAnyOperationStarted(context), roleCheck(), PhaseLibrary.isPhaseModelActiveInDataObject(context, binding)]).then(async checks => {
            const anythingStarted = checks[0];
            const userRoleType = checks[1];
            const isPhaseModelActiveInDataObject = checks[2];

            // Return empty list for Operations without mobile status
            if (libVal.evalIsEmpty(binding.OperationMobileStatus_Nav)) {
                return Promise.resolve([]);
            }

            let orderEAMStatusProfile = '';

            if (IsPhaseModelEnabled(context) && binding.WOHeader && binding.WOHeader.OrderType) {
                orderEAMStatusProfile = await context.read('/SAPAssetManager/Services/AssetManager.service', 'OrderTypes', ['EAMOverallStatusProfile'], `$filter=OrderType eq '${binding.WOHeader.OrderType}'`).then(orderTypeArray => {
                    if (orderTypeArray.length > 0) {
                        return orderTypeArray.getItem(0).EAMOverallStatusProfile;
                    }
                    return '';
                });
            }

            const mobileStatus = binding.OperationMobileStatus_Nav.MobileStatus;
            const statusIsLocal = binding.OperationMobileStatus_Nav['@sap.isLocal'];
            const isClockedIn = (libClock.isBusinessObjectClockedIn(context) && libClock.allowClockInOverride(context, mobileStatus));
            let entitySet = binding['@odata.readLink'] + '/OperationMobileStatus_Nav/OverallStatusCfg_Nav/OverallStatusSeq_Nav';
            let queryOptions = `$expand=NextOverallStatusCfg_Nav&$filter=UserPersona eq '${personaLib.getActivePersona(context)}' and (ToEAMOverallStatusProfile eq '${orderEAMStatusProfile}' or  ToEAMOverallStatusProfile eq '')`;

            if (isClockedIn && mobileStatus !== STARTED) { //User is clocked in, but mobile status is not STARTED because another user has changed it.  We will use the next available statuses for STARTED
                entitySet = 'EAMOverallStatusSeqs';
                queryOptions += " and OverallStatusCfg_Nav/MobileStatus eq 'STARTED' and OverallStatusCfg_Nav/ObjectType eq 'WO_OPERATION'";
            } else if (common.isEntityLocal(binding)) { //Our normal lookup doesn't work for local operations (MobileStatus/OverallStatusCfg_Nav/OverallStatusSeq_Nav is empty)
                entitySet = 'EAMOverallStatusSeqs';
                queryOptions += " and OverallStatusCfg_Nav/MobileStatus eq '" + mobileStatus + "' and OverallStatusCfg_Nav/ObjectType eq 'WO_OPERATION'";
            }

            // If CICO enabled, current Operation is started, and this object is not clocked in, do not transition; clock in immediately
            if (!anythingStarted && mobileStatus === STARTED && (cicoEnabled && !isClockedIn)) {
                return [{'Title': context.localizeText('clock_in'), 'OnPress': '/SAPAssetManager/Actions/WorkOrders/MobileStatus/OperationDummyStatusToast.action'}];
            } else {
                return libSuper.checkReviewRequired(context, binding).then(review => {
                    return context.read('/SAPAssetManager/Services/AssetManager.service', `${binding['@odata.readLink']}/OperationMobileStatus_Nav`, [], '$expand=OverallStatusCfg_Nav').then(rollback => {
                        common.setStateVariable(context, 'PhaseModelRollbackStatus', rollback.getItem(0)); //Save the rollback state to use if necessary
                        return PhaseLibrary.getActivePhaseControls(context, binding).then(stopKeys => {
                            return context.read('/SAPAssetManager/Services/AssetManager.service', entitySet, [], queryOptions).then(codes => {
                                let popoverItems = [];

                                // Go through each available next status and create a PopoverItems array
                                codes.forEach(element => {
                                    let statusElement = element.NextOverallStatusCfg_Nav;
                                    if (statusElement) {
                                        let transitionText;
                                        let transitionType;
                                        if (element.TransitionType) {
                                            transitionType = element.TransitionType;
                                        }

                                        // If there is a TranslationTextKey available, use that for the popover item. Otherwise, use the OverallStatusLabel.
                                        if (statusElement.TransitionTextKey) {
                                            if (cicoEnabled && statusElement.MobileStatus === STARTED) {
                                                transitionText = context.localizeText('clock_in');
                                            } else {
                                                transitionText = context.localizeText(statusElement.TransitionTextKey);
                                            }
                                        } else {
                                            transitionText = statusElement.OverallStatusLabel;
                                        }

                                        // Check for Phase Control Statuses. If one is found for the current transition, preempt it here
                                        if (element.RoleType === userRoleType && PhaseLibrary.isPhaseStatusChangeBlocked(stopKeys, statusElement)) {
                                            popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'TransitionType': transitionType, 'OnPress': PhaseLibrary.getPhaseStatusChangeBlockedMessageAction(context)});
                                        } else {
                                            // Add items to possible transitions list
                                            if (statusElement.OverallStatusLabel && statusElement.OverallStatusLabel.toLowerCase() === 'transfer'
                                                && (assnType === '4' || assnType === 'A')) {
                                                Logger.info(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryMobileStatus.global').getValue(), 'Assignment type is 4, trasfer is not supported.');
                                            } else if (statusElement.MobileStatus === APPROVE && element.RoleType === userRoleType) {
                                                let postUpdateRule;
                                                if (libSuper.isAutoCompleteOnApprovalEnabled(context)) {
                                                    WorkOrderCompletionLibrary.getInstance().setIsAutoCompleteOnApprovalFlag(context, true);
                                                    postUpdateRule = '/SAPAssetManager/Rules/Supervisor/ApprovalPostUpdate.js';
                                                } else {
                                                    postUpdateRule = '/SAPAssetManager/Rules/MobileStatus/OperationMobileStatusPostUpdate.js';
                                                }
                                                popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav', postUpdateRule, binding), 'TransitionType': transitionType});
                                            } else if (statusElement.MobileStatus === DISAPPROVE && element.RoleType === userRoleType) {
                                                common.setStateVariable(context, 'PhaseModelStatusElement', statusElement);
                                                popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/Supervisor/Reject/RejectReasonPhaseModelNav.js', 'TransitionType': transitionType});
                                            } else if (statusElement.MobileStatus === REJECTED && personaLib.isFieldServiceTechnician(context)) {
                                                common.setStateVariable(context, 'RejectStatusElement', statusElement);
                                                common.setStateVariable(context, 'IsOnRejectOperation', true);
                                                common.setStateVariable(context, 'IsOnRejectOperationBinding', binding);
                                                popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/MobileStatus/OperationRejectCreateRejectReasonNav.js', 'TransitionType': transitionType}); // add reject reason as a note
                                            } else if (statusElement.MobileStatus === REVIEW && element.RoleType === userRoleType) {
                                                if (review) { //Review required for tech
                                                    popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/WorkOrders/Operations/NavOnCompleteOperationPage.js', 'TransitionType': transitionType});
                                                }
                                            } else if (statusElement.MobileStatus === COMPLETE && element.RoleType === userRoleType && mobileStatus !== REVIEW) {
                                                let isCompleteVisible = (!userRoleType || userRoleType === 'S' || (userRoleType === 'T' && !review)); //Allow complete if not using supervisor feature or supervisor or if technician and WO does not require review
                                                if (libSuper.isSupervisorFeatureEnabled(context) && userRoleType === 'S' && mobileStatus === DISAPPROVE && !statusIsLocal) {
                                                    isCompleteVisible = false; //Supervisor can only transition from DISAPPROVE to COMPLETE if status change is local
                                                }
                                                if (isCompleteVisible) {
                                                    popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/WorkOrders/Operations/NavOnCompleteOperationPage.js', 'TransitionType': transitionType});
                                                }
                                            } else if (statusElement.MobileStatus === TRANSFER && (element.RoleType === userRoleType || personaLib.isFieldServiceTechnician(context) || !libSuper.isSupervisorFeatureEnabled(context))) {
                                                // Prepend warning dialog to transfer status change
                                                popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'TransitionType': transitionType, 'OnPress': {
                                                    'Name': '/SAPAssetManager/Actions/Common/GenericWarningDialog.action',
                                                    'Properties': {
                                                        'Title': context.localizeText('confirm_status_change'),
                                                        'Message': context.localizeText('transfer_operation_warning_message'),
                                                        'OKCaption': context.localizeText('ok'),
                                                        'CancelCaption': context.localizeText('cancel'),
                                                        'OnOK': '/SAPAssetManager/Actions/WorkOrders/Operations/OperationTransferNav.action',
                                                    },
                                                }});
                                            } else {
                                                // Add all other items to possible transitions as-is
                                                // Omit Started if other work orders have been started
                                                // Omit statuses not relevant to current role

                                                // TODO: EAM Team currently has status changes hardcoded in "Perform Maintenance Jobs" app. Remove hardcoded conditionals once this changes.
                                                // Original code:
                                                // if (!(statusElement.MobileStatus === STARTED && anythingStarted) && element.RoleType === supervisorRole) {
                                                //     popoverItems.push({'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav')});
                                                // } else {
                                                //     // Do nothing
                                                // }
                                                if (isPhaseModelActiveInDataObject) {
                                                    if (((mobileStatus === READY && statusElement.MobileStatus === STARTED && !anythingStarted) ||
                                                        (mobileStatus === STARTED && statusElement.MobileStatus === HOLD) ||
                                                        (mobileStatus === HOLD && statusElement.MobileStatus === STARTED && !anythingStarted) ||
                                                        (mobileStatus === DISAPPROVE && statusElement.MobileStatus === STARTED && !anythingStarted) ||
                                                        (mobileStatus === REVIEW && statusElement.MobileStatus === STARTED && !anythingStarted) ||
                                                        (mobileStatus === RECEIVED && statusElement.MobileStatus === STARTED && !anythingStarted)) && element.RoleType === userRoleType) {
                                                        popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav', '/SAPAssetManager/Rules/MobileStatus/OperationMobileStatusPostUpdate.js', binding), 'TransitionType': transitionType});
                                                    }

                                                    if (mobileStatus === STARTED && statusElement.MobileStatus === COMPLETE && element.RoleType === userRoleType) {
                                                        popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/WorkOrders/Operations/NavOnCompleteOperationPage.js', 'TransitionType': transitionType});
                                                    }

                                                    if ((statusElement.MobileStatus === APPROVE || statusElement.MobileStatus === DISAPPROVE)
                                                        && userRoleType === 'S') {
                                                        popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav', undefined, binding), 'TransitionType': transitionType});
                                                    }
                                                } else if (!(statusElement.MobileStatus === STARTED && anythingStarted) && element.RoleType === userRoleType
                                                    && statusElement.MobileStatus !== APPROVE
                                                    && statusElement.MobileStatus !== COMPLETE
                                                    && statusElement.MobileStatus !== DISAPPROVE) {
                                                    popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav', '/SAPAssetManager/Rules/MobileStatus/OperationMobileStatusPostUpdate.js', binding), 'TransitionType': transitionType});
                                                } else if (personaLib.isFieldServiceTechnician(context) && statusElement.MobileStatus === COMPLETE) {
                                                    popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': '/SAPAssetManager/Rules/WorkOrders/Operations/NavOnCompleteOperationPage.js', 'TransitionType': transitionType});
                                                } else if (personaLib.isFieldServiceTechnician(context) && !(statusElement.MobileStatus === STARTED && anythingStarted)) {
                                                    popoverItems.push({'Status': statusElement.MobileStatus, 'Title': transitionText, 'OnPress': mobileStatusOverride(context, statusElement, 'OperationMobileStatus_Nav', '/SAPAssetManager/Rules/MobileStatus/OperationMobileStatusPostUpdate.js', binding), 'TransitionType': transitionType});
                                                }
                                            }
                                        }
                                    }
                                });

                                if (mobileStatus !== STARTED && mobileStatus !== COMPLETE) { //Add supervisor role assignment options only if the operation is not started or completed (These are not data driven currently)
                                    return Promise.all([isAssignEnableWorkOrderOperation(context, binding), isUnAssignEnableWorkOrderOperation(context, binding)]).then(assignResults => {
                                        const assign = assignResults[0];
                                        const unassign = assignResults[1];

                                        if (assign) {
                                            popoverItems.push({'Title': context.localizeText('assign'), 'OnPress': '/SAPAssetManager/Rules/Supervisor/Assign/OperationAssignNav.js', 'TransitionType': 'S'});
                                        }
                                        if (unassign) {
                                            popoverItems.push({'Title': context.localizeText('unassign'), 'OnPress': '/SAPAssetManager/Rules/Supervisor/UnAssign/OperationUnAssignNav.js', 'TransitionType': 'N'});
                                            popoverItems.push({'Title': context.localizeText('reassign'), 'OnPress': '/SAPAssetManager/Rules/Supervisor/ReAssign/OperationReAssignNav.js', 'TransitionType': 'S'});
                                        }

                                        return popoverItems;
                                    }).catch(err => {
                                        Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryMobileStatus.global').getValue(), err);
                                        return popoverItems;
                                    });
                                } else {
                                    return Promise.resolve(popoverItems);
                                }

                            });
                        });
                    });
                });
            }
        });
    }
}
