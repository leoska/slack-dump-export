import downloadUsersAvatars from "./tasks/downloadAvatars";
import { autoUpdate, downloadAvatars as configDownloadAvatars, mongo } from './config';
import auth from './auth';
import logger from "./logger";
import { exportChannels, exportDM, exportGroups } from "./app";
import { getUsers, saveToMongo, updateUser } from './mongo';
import api from "./api";
import _ from 'lodash';


export default class Daemon {
    _intervalId = null;
    _inWork = false;
    _asyncTasks = [];
    _userSession = `noname_${Date.now()}`;
    
    constructor(userSession) {
        if (!autoUpdate.enabled)
            throw new Error(`[Daemon -> constructor] Daemon was disabled in config! Check property [autoUpdate.enabled].`);
        
        if (autoUpdate.enabled && !mongo.enabled)
            throw new Error(`[Daemon -> constructor] Daemon mode currently supports only mongo mode.`);

        if (userSession)
            this._userSession = userSession;
        
        this.init();
    }
    
    async init() {
        this.process();
        this._intervalId = setInterval(this.process.bind(this), autoUpdate.refresh);
    }

    /**
     * 
     * @returns {Promise<void>}
     */
    async process() {
        if (this._inWork)
            return;

        this._inWork = true;
        this._asyncTasks = [];
        const stamp = Date.now();

        try {
            logger.log(`[Daemon -> process] started processing...`);
            
            // Check authorization
            if (await auth()) {
                // Export all users from workspace
                await this._checkUsers(this._asyncTasks);

                // Export channels
                logger.log(`[Daemon -> process] started processing export public and private channels.`);
                await exportChannels(this._userSession, this._asyncTasks, true);

                // Export groups (mpims)
                logger.log(`[Daemon -> process] started processing groups.`);
                await exportGroups(this._userSession, this._asyncTasks, true);

                // Export DMs (ims)
                logger.log(`[Daemon -> process] started processing direct messages.`);
                await exportDM(this._userSession, this._asyncTasks, true);

                logger.log(`[Daemon -> process] at last, waiting all async tasks to complete.`);
                await Promise.all(this._asyncTasks);
                
                logger.log(`[Daemon -> process] Successfully finished processing. Time in work [${Date.now() - stamp}]ms`);
            }
        } catch(e) {
            logger.error(`[Daemon -> process] Something went wrong: ${e.stack}`);
        } finally {
            this._inWork = false;
        }
    }

    /**
     * Check and update all users
     * 
     * @param asyncTasks
     * @returns {Promise<void>}
     * @private
     */
    async _checkUsers(asyncTasks) {
        // Export all users from workspace
        const usersSlack = (await api('users.list')).members;
        
        // Export users from mongoDb
        const usersDb = (await getUsers()) || [];
        
        const insertUsers = [];
        const downloadAvatars = [];

        // Check all users
        for (const userSlack of usersSlack) {
            const userDb = usersDb.find((user) => user.id === userSlack.id);
            
            if (!userDb) {
                userSlack._id = userSlack.id;
                insertUsers.push(userSlack);
                downloadAvatars.push(userSlack);
            } else if (!_.isEqual(userSlack, userDb)) {
                asyncTasks.push(updateUser(userSlack));
                
                if (userSlack?.profile?.image_original !== userDb?.profile?.image_original) {
                    downloadAvatars.push(userSlack);
                }
            }
        }
        
        // Save users (new users)
        if (insertUsers.length)
            asyncTasks.push(saveToMongo('users', insertUsers));

        // Export all user's avatars
        if (configDownloadAvatars && downloadAvatars.length)
            asyncTasks.push(downloadUsersAvatars(downloadAvatars, this._userSession).catch((e) => logger.error(e.stack)));
    }
}
