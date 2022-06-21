import auth from './auth';
import api from './api';
import writeFile from './tasks/writeFile';
import downloadAvatars from './tasks/downloadAvatars';
import conversation from './tasks/conversation';
import downloadAttachments from './tasks/downloadAttachments';
import { saveToMongo, getLastStampMessage } from "./mongo";
import getDialogType from './getDialogType';
import { filter, downloadAvatars as configDownloadAvatars, mongo, autoUpdate } from './config';
import { getFilterKey } from './getDialogType';
import logger from './logger';

export default async function process(userSession = `noname_${Date.now()}`) {
    // Check authorization
    if (await auth()) {
        const asyncTasks = [];
    
        // Export all users from workspace
        const users = (await api('users.list')).members;
    
        // Save result to file
        asyncTasks.push(writeFile('users.list', users, userSession));
    
        // Export all user's avatars
        if (configDownloadAvatars)
            asyncTasks.push(downloadAvatars(users, userSession).catch((e) => logger.error(e.stack)));
    
        // Export channels
        await exportChannels(userSession, asyncTasks);
    
        // Export groups (mpims)
        await exportGroups(userSession, asyncTasks);
    
        // Export DMs (ims)
        await exportDM(userSession, asyncTasks);
    
        // Wait all async tasks
        await Promise.all(asyncTasks);
    }
}

/**
 * Filter channel by include and exclude arrays from settings
 * 
 * @param {Object} channel 
 * @param {String} dialogType 
 * @returns {Boolean}
 */
function filterChannel(channel, dialogType) {
    const configFilterObj = filter[getFilterKey(dialogType)];

    if (Array.isArray(configFilterObj.include) && configFilterObj.include.length) {
        return configFilterObj.include.includes(channel.id);
    }

    if (Array.isArray(configFilterObj.exclude) && configFilterObj.exclude.length) {
        return !configFilterObj.exclude.includes(channel.id);
    }

    return true;
}

/**
 * Export public and private channels
 *
 * @async
 * @param {String} userSession 
 * @param {Array<Promise>} asyncTasks 
 * @param {Boolean} [useLastStamp]
 * @returns {Promise<void>}
 */
export async function exportChannels(
    userSession, 
    asyncTasks, 
    useLastStamp = false
) {
    // Check settings filter enabled
    if (filter.publicChannels.enabled) {
        // Export public channels
        const publicChannels = (await api('conversations.list', 'get', {
            limit: 1000,
            types: 'public_channel',
        })).channels;

        // Filter by include and exclude
        const publicChannelsFiltered = publicChannels.filter((channel) => filterChannel(channel, getDialogType(channel)));

        // Save result to file (in Daemon mode file mode not work)
        if (!autoUpdate.enabled)
            asyncTasks.push(writeFile('public_channels.list', publicChannelsFiltered, userSession));

        // Save result to mongoDb
        if (mongo.enabled) {
            // Set ID for mongoDb
            for (const channel of publicChannelsFiltered) {
                channel._id = channel.id;
            }

            // Push data to mongoDb
            asyncTasks.push(saveToMongo('public_channels', publicChannelsFiltered));
        }
            

        // Process every conversation in public channels
        for (const channel of publicChannelsFiltered) {
            const stamp = useLastStamp && mongo.enabled ? await getLastStampMessage(channel.id) :  filter.publicChannels.timeStampLimit;
            await conversation(channel, userSession, stamp).then((messages) => {
                if (filter.publicChannels.downloadFiles)
                    asyncTasks.push(downloadAttachments(messages, userSession, channel.id, getDialogType(channel)).catch((e) => logger.error(e.stack)));
                
                if (mongo.enabled) {
                    // Set ID for mongoDb
                    for (const message of messages) {
                        message._id = message.ts;
                    }

                    asyncTasks.push(saveToMongo(channel.id, messages).catch((e) => logger.error(e.stack)));
                }
            });
        }
    }

    // Check settings filter enabled
    if (filter.privateChannels.enabled) {
        // Export private channels
        const privateChannels = (await api('conversations.list', 'get', {
            limit: 1000,
            types: 'private_channel',
        })).channels;

        // Filter by include and exclude
        const privateChannelsFiltered = privateChannels.filter((channel) => filterChannel(channel, getDialogType(channel)));

        // Save result to file (in Daemon mode file mode not work)
        if (!autoUpdate.enabled)
            asyncTasks.push(writeFile('private_channels.list', privateChannelsFiltered, userSession));

        // Save result to mongoDb
        if (mongo.enabled) {
            // Set ID for mongoDb
            for (const channel of privateChannelsFiltered) {
                channel._id = channel.id;
            }

            // Push data to mongoDb
            asyncTasks.push(saveToMongo('private_channels', privateChannelsFiltered));
        }
            

        // Process every conversation in private channels
        for (const channel of privateChannelsFiltered) {
            const stamp = useLastStamp && mongo.enabled ? await getLastStampMessage(channel.id) :  filter.privateChannels.timeStampLimit;
            await conversation(channel, userSession, stamp).then((messages) => {
                if (filter.privateChannels.downloadFiles)
                    asyncTasks.push(downloadAttachments(messages, userSession, channel.id, getDialogType(channel)).catch((e) => logger.error(e.stack)));

                if (mongo.enabled) {
                    // Set ID for mongoDb
                    for (const message of messages) {
                        message._id = message.ts;
                    }

                    asyncTasks.push(saveToMongo(channel.id, messages).catch((e) => logger.error(e.stack)));
                }
            });
        }
    }

}

/**
 * Export MPIMs (groups)
 * 
 * @async
 * @param {String} userSession 
 * @param {Array<Promise>} asyncTasks 
 * @param {Boolean} [useLastStamp]
 * @returns {Promise<void>}
 */
export async function exportGroups(userSession, asyncTasks, useLastStamp = false) {
    if (!filter.mpims.enabled)
        return;

    // Export groups
    const groups = (await api('conversations.list', 'get', {
        limit: 1000,
        types: 'mpim',
    })).channels;

    // Filter by include and exclude
    const groupsFiltered = groups.filter((channel) => filterChannel(channel, getDialogType(channel)));

    // Save result to file (In Daemon mode file mode not work)
    if (!autoUpdate.enabled)
        asyncTasks.push(writeFile('mpims.list', groupsFiltered, userSession));

    // Save result to mongoDb
    if (mongo.enabled) {
        // Set ID for mongoDb
        for (const group of groupsFiltered) {
            group._id = group.id;
        }

        // Push data to mongoDb
        asyncTasks.push(saveToMongo('mpims', groupsFiltered));
    }
        

    // Process every conversation in groups
    for (const group of groupsFiltered) {
        const stamp = useLastStamp && mongo.enabled ? await getLastStampMessage(group.id) :  filter.mpims.timeStampLimit;
        await conversation(group, userSession, stamp).then((messages) => {
            if (filter.mpims.downloadFiles)
                asyncTasks.push(downloadAttachments(messages, userSession, group.id, getDialogType(group)).catch((e) => logger.error(e.stack)));

            if (mongo.enabled) {
                // Set ID for mongoDb
                for (const message of messages) {
                    message._id = message.ts;
                }

                asyncTasks.push(saveToMongo(group.id, messages).catch((e) => logger.error(e.stack)));
            }
        });
    }
}

/**
 * Export IMs (direct messages)
 * 
 * @async
 * @param {String} userSession 
 * @param {Array<Promise>} asyncTasks 
 * @param {Boolean} [useLastStamp]
 * @returns {Promise<void>}
 */
export async function exportDM(userSession, asyncTasks, useLastStamp = false) {
    if (!filter.ims.enabled)
        return;

    // Export DMs
    const dms = (await api('conversations.list', 'get', {
        limit: 1000,
        types: 'im',
    })).channels;

    // Filter by include and exclude
    const dmsFiltered = dms.filter((channel) => filterChannel(channel, getDialogType(channel)));

    // Save result to file (In Daemon mode file mode not work)
    if (!autoUpdate.enabled)
        asyncTasks.push(writeFile('ims.list', dmsFiltered, userSession));

    // Save result to mongoDb
    if (mongo.enabled) {
        // Set ID for mongoDb
        for (const dm of dmsFiltered) {
            dm._id = dm.id;
        }

        // Push data to mongoDb
        asyncTasks.push(saveToMongo('ims', dmsFiltered));
    }
        

    // Process every conversation in DMs
    for (const dm of dmsFiltered) {
        const stamp = useLastStamp && mongo.enabled ? await getLastStampMessage(dm.id) : filter.ims.timeStampLimit;
        await conversation(dm, userSession, stamp).then((messages) => {
            if (filter.ims.downloadFiles)
                asyncTasks.push(downloadAttachments(messages, userSession, dm.id, getDialogType(dm)).catch((e) => logger.error(e.stack)));

            if (mongo.enabled) {
                // Set ID for mongoDb
                for (const message of messages) {
                    message._id = message.ts;
                }
                
                asyncTasks.push(saveToMongo(dm.id, messages).catch((e) => logger.error(e.stack)));
            }
        });
    }
}