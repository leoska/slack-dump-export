// Dialog types
export const DIALOG_TYPES = {
    PRIVATE_CHANNEL: 'PRIVATE_CHANNEL',
    PUBLIC_CHANNEL: 'PUBLIC_CHANNEL',
    MPIM: 'MPIM',
    IM: 'IM',
};

/**
 * Get filter object key by dialogType
 * 
 * @param {String} dialogType 
 * @returns {String}
 */
export function getFilterKey(dialogType) {
    switch(dialogType) {
        case DIALOG_TYPES.PUBLIC_CHANNEL:
            return 'publicChannels';

        case DIALOG_TYPES.PRIVATE_CHANNEL:
            return 'privateChannels';

        case DIALOG_TYPES.MPIM:
            return 'mpims';

        case DIALOG_TYPES.IM:
            return 'ims';

        default:
            throw new Error(`[getFilterKey] undefined dialogType [${dialogType}]!`);
    }
}


/**
 * Return dialog type from dialog object (slack's channel)
 * 
 * @param {Object} dialog 
 * @returns {String}
 */
export default function getDialogType(dialog) {
    // Пытаемся понять тип диалога
    if (dialog.is_channel) {
        if (dialog.is_private)
            return DIALOG_TYPES.PRIVATE_CHANNEL;
        else
            return DIALOG_TYPES.PUBLIC_CHANNEL;
    } else if (dialog.is_mpim || dialog.is_group) {
        return DIALOG_TYPES.MPIM;
    } else if (dialog.is_im) {
        return DIALOG_TYPES.IM;
    } else {
        const dialogName = dialog.name ? `(${dialog.name})` : '';

        throw new Error(`Undefined dialog [${dialog.id}] ${dialogName} type!`);
    }
}