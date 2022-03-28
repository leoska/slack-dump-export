import api from "../api";
import { DIR_BY_TYPES } from './initDir';
import getDialogType from '../getDialogType';
import timeout from "./timeout";
import path from 'path';
import writeFile from "./writeFile";
import fs from 'fs';
import logger from "../logger";

// Sleep in ms between API requests
const SLEEP_TIMEOUT_MS = 200;

// Limit history parameter
const LIMIT_HISTORY = 1000;

const AMOUNT_ATTEMTP_COUNT = 3;

/**
 * Export conversation to data
 * 
 * @param {Object} dialog 
 * @param {String} userSession 
 * @param {Number} [latestStamp]
 */
export default async function conversation(dialog, userSession, latestStamp = 0) {
    const dialogName = dialog.name ? `(${dialog.name})` : '';

    try {
        let data, latest = undefined;
        let messages = [];
        let typeDialog = getDialogType(dialog);
        let stop = false;
    
        logger.info(`Preparing to export chat history [${dialog.id}] ${dialogName}`);
    
        // Download all history messages
        do {
            data = await getData(dialog, latest);
            
            latest = data && Array.isArray(data.messages) && data.messages.length ? Number(data.messages[data.messages.length - 1].ts) : undefined;

            // Check last message by latest if filter value latestStamp is enabled
            if (latestStamp && latest <= latestStamp) {
                data.messages = data.messages.filter((msg) => msg.ts > latestStamp);
                stop = true;
            }
    
            // Concat messages with new data
            messages = messages.concat(data.messages);
    
            if (!stop) {
                await timeout(SLEEP_TIMEOUT_MS);
                logger.info(`[Conversation] export chat history progress: latest - ${latest}; total items - ${messages.length}`);
            }
                
        } while (data && data.has_more && !stop);
    
        // Определяем базовую папку
        const parentFolder = DIR_BY_TYPES[typeDialog];
    
        const basePath = path.resolve(process.cwd(), 'data', userSession, parentFolder, dialog.id);
        await initSubDir(basePath);
    
        const relativePath = path.join(parentFolder, dialog.id, 'data');
    
        await writeFile(relativePath, messages, userSession);
        logger.info(`Successfully exported chat history [${dialog.id}] ${dialogName}`);

        return messages;
    } catch(e) {
        logger.error(`[Conversation] Something went wrong on exported chat history [${dialog.id}] (${dialog.name}). Error: ${e.stack}`);
    }
}

/**
 * Try to fetch data by uri
 * 
 * @async
 * @param {Object} dialog 
 * @param {Number} latest 
 * @param {Number} [amountTry]
 * @returns {Object}
 */
async function getData(dialog, latest, amountTry = 0) {
    try {
        return await api('conversations.history', 'get', {
            limit: LIMIT_HISTORY,
            channel: dialog.id,
            latest,
        });
    } catch(e) {
        if (e.message.indexOf('error request aborted') > -1) {
            if (amountTry < AMOUNT_ATTEMTP_COUNT) {
                logger.warn(`Api [conversations.history] has 'error request aborted', try again to call. Attempt: [${++amountTry}]`);
                await timeout(500);
                return await getData(dialog, latest, amountTry);
            }
        }

        throw e;
    }
}

/**
 * Initialize (mkdir) subFolder in data/<userSession>
 * 
 * @async
 * @param {String} basePath 
 * @returns {Promise<void>}
 */
async function initSubDir(basePath) {
    await fs.promises.mkdir(basePath);

    return await Promise.all([
        fs.promises.mkdir(path.resolve(basePath, 'files'))
    ]);
}