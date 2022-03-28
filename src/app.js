import auth from './auth';
import api from './api';
import writeFile from './tasks/writeFile';
import downloadAvatars from './tasks/downloadAvatars';
import conversation from './tasks/conversation';
import downloadAttachments from './tasks/downloadAttachments';
import getDialogType from './getDialogType';
import { filter, downloadAvatars as configDownloadAvatars } from './config';
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
 * @returns {Promise<void>}
 */
async function exportChannels(userSession, asyncTasks) {
    // Check settings filter enabled
    if (filter.publicChannels.enabled) {
        // Export public channels
        const publicChannels = (await api('conversations.list', 'get', {
            limit: 1000,
            types: 'public_channel',
        })).channels;

        // Filter by include and exclude
        const publicChannelsFiltered = publicChannels.filter((channel) => filterChannel(channel, getDialogType(channel)));

        // Save result to file
        asyncTasks.push(writeFile('public_channels.list', publicChannelsFiltered, userSession));

        // Process every conversation in public channels
        for (const channel of publicChannelsFiltered) {
            await conversation(channel, userSession, filter.publicChannels.timeStampLimit).then((messages) => 
                filter.publicChannels.downloadFiles && asyncTasks.push(downloadAttachments(messages, userSession, channel.id, getDialogType(channel)).
                catch((e) => logger.error(e.stack)))
            );
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

        // Save result to file
        asyncTasks.push(writeFile('private_channels.list', privateChannelsFiltered, userSession));

        // Process every conversation in private channels
        for (const channel of privateChannelsFiltered) {
            await conversation(channel, userSession, filter.privateChannels.timeStampLimit).then((messages) => 
                filter.privateChannels.downloadFiles && asyncTasks.push(downloadAttachments(messages, userSession, channel.id, getDialogType(channel)).
                catch((e) => logger.error(e.stack)))
            );
        }
    }

}

/**
 * Export MPIMs (groups)
 * 
 * @async
 * @param {String} userSession 
 * @param {Array<Promise>} asyncTasks 
 * @returns {Promise<void>}
 */
async function exportGroups(userSession, asyncTasks) {
    if (!filter.mpims.enabled)
        return;

    // Export groups
    const groups = (await api('conversations.list', 'get', {
        limit: 1000,
        types: 'mpim',
    })).channels;

    // Filter by include and exclude
    const groupsFiltered = groups.filter((channel) => filterChannel(channel, getDialogType(channel)));

    // Save result to file
    asyncTasks.push(writeFile('mpims.list', groupsFiltered, userSession));

    // Process every conversation in groups
    for (const group of groupsFiltered) {
        await conversation(group, userSession, filter.mpims.timeStampLimit).then((messages) => 
            filter.mpims.downloadFiles && asyncTasks.push(downloadAttachments(messages, userSession, group.id, getDialogType(group)).
            catch((e) => logger.error(e.stack)))
        );
    }
}

/**
 * Export IMs (direct messages)
 * 
 * @async
 * @param {String} userSession 
 * @param {Array<Promise>} asyncTasks 
 * @returns {Promise<void>}
 */
async function exportDM(userSession, asyncTasks) {
    if (!filter.ims.enabled)
        return;

    // Export DMs
    const dms = (await api('conversations.list', 'get', {
        limit: 1000,
        types: 'im',
    })).channels;

    // Filter by include and exclude
    const dmsFiltered = dms.filter((channel) => filterChannel(channel, getDialogType(channel)));

    // Save result to file
    asyncTasks.push(writeFile('ims.list', dmsFiltered, userSession));

    // Process every conversation in DMs
    for (const dm of dmsFiltered) {
        await conversation(dm, userSession, filter.ims.timeStampLimit).then((messages) => 
            filter.ims.downloadFiles && asyncTasks.push(downloadAttachments(messages, userSession, dm.id, getDialogType(dm)).
            catch((e) => logger.error(e.stack)))
        );
    }
}