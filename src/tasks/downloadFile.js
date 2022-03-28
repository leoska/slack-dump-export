import axios from 'axios';
import { token } from "../config";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import MIME_MATCH from '../mimeTypes';
import timeout from './timeout';
import logger from '../logger';

// Timeout of request
const TIMEOUT_ATTEMPT_CALLAPI = 120000;

// Size of generation name string 
const FILE_LENBYTES_CRYPTO = 16;

const AMOUNT_ATTEMTP_COUNT = 3;

/**
 * Download file by url
 * 
 * @async
 * @param {String} url 
 * @param {String} dir 
 * @param {String} userSession 
 * @param {String} name 
 * @param {String} extension 
 * @returns {String}
 */
export default async function downloadFile(url, dir, userSession, name = '', extension = '', useToken = true, amountTry = 0) {
    try {
        // Need emulate browser request
        const config = {
            responseType: 'stream',
            headers: { 
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
            },
            timeout: TIMEOUT_ATTEMPT_CALLAPI,
        }

        if (useToken)
            config.headers["Authorization"] = `Bearer ${token}`;

        const res = await axios.get(url, config);

        const data = res.data;

        // If name is missing, try get filename from url, else generate random filename.
        if (!name) {
            const extInUrl = path.extname(url);
            name = path.basename(url, extInUrl);

            if (!name)
                name = crypto.randomBytes(FILE_LENBYTES_CRYPTO).toString('base64').replace(/[+=/-]/g, '').substr(0, 12);
        } 

        // Check extname
        if (!extension) {
            extension = path.extname(url);

            if (!extension) {
                // Try get extname of file
                const mimeMatch = res.headers['content-type'];
                extension = MIME_MATCH[mimeMatch] ?  `.${MIME_MATCH[mimeMatch]}` : '';
    
                if (!extension)
                    logger.warn(`Extension [${mimeMatch}] is missed in MIME_MATCH dictionary!`);
            }
        }

        // Extname must be start with dot
        if (!(/^\./.test(extension)))
            extension = `.${extension}`;

        // Build base path for file stream
        const fName = `${dir ? `${dir}/` : ''}${name}${extension}`;
        const basePath = path.resolve(process.cwd(), 'data', userSession, fName);
        const writer = fs.createWriteStream(basePath);

        // Pipe stream
        data.pipe(writer);

        // Waiting where write stream will finished
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `${name}${extension}`;
    } catch(e) {
        if (e.response) {
            if (e.response.status === 404)
                logger.warn(`File [${url}] is missed. Status code: 404; statux text: ${e.response.statusText}`);

            if (amountTry >= AMOUNT_ATTEMTP_COUNT)
                throw e;

            // Error 400
            if (e.response.status === 400) {
                logger.warn(`File [${url}] returned status code 400, try again to download. Attempt: [${++amountTry}]`);
                await timeout(500);
                return await downloadFile(url, dir, userSession, name, extension, useToken, amountTry);
            } 
            // read ECONNRESET
            else if (e.message.indexOf('read ECONNRESET') > -1) {
                logger.warn(`File [${url}] connection catch Error: read ECONNRESET, try again to download. Attempt: [${++amountTry}]`);
                await timeout(500);
                return await downloadFile(url, dir, userSession, name, extension, useToken, amountTry);
            } 
            // Timeout has reached
            else if (e.message.indexOf('timeout') > -1) {
                logger.warn(`File [${url}] timeout has reached, try again to download. Attempt: [${++amountTry}]`);
                await timeout(500);
                return await downloadFile(url, dir, userSession, name, extension, useToken, amountTry);
            }
        } 

        throw e;
    }
}