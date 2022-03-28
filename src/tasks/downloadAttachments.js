import path from 'path';
import downloadFile from './downloadFile';
import { DIR_BY_TYPES } from './initDir';
import { fileSizeLimit } from '../config';
import logger from '../logger';

const AMOUNT_PAUSE = 5;

export default async function downloadAttachments(messages, userSession, dialogId, dialogType) {
    let tasks = [];

    for (const message of (messages || [])) {
        if (!Array.isArray(message.files))
            continue;

        for (const file of message.files) {
            try {
                if (file.mode === 'tombstone') {
                    logger.warn(`File [${file.id}] has been removed. Just skipped.`);
                    continue;
                } else if (file.mode === 'file_access' && file.file_access === 'access_denied') {
                    logger.warn(`File [${file.id}] has access denied. Just skipped.`);
                    continue;
                }

                if (file.size > fileSizeLimit) {
                    logger.warn(`File [${file.id}] ${file.name} size is bigger that parameter fileSizeLimit. Just skipped.`);
                    continue;
                }
    
                if (file.is_external) {
                    logger.warn(`File [${file.id}] ${file.name} is external [${file.external_type}]. Just skipped.`);
                    continue;
                }
    
                const extName = file.filetype ? `.${file.filetype}` : path.extname(file.name);
                const relativePath = path.join(DIR_BY_TYPES[dialogType], dialogId, 'files');
    
                tasks.push(downloadFile(file.url_private_download, relativePath, userSession, file.id, extName).then((fName) => {
                    logger.info(`File (${path.join(relativePath, fName)}) successfully downloaded!`);
                }, (e) => {
                    logger.warn(`File (${path.join(relativePath, `${file.id}${extName}`)}) something went wrong: ${e.stack}`);
                }));
    
                if (tasks.length >= AMOUNT_PAUSE) {
                    await Promise.all(tasks);
                    tasks = [];
                }
            } catch(e) {
                logger.error(`${e.stack}\nFile: ${JSON.stringify(file)}`);
            }
        }
    }

    return await Promise.all(tasks);
}