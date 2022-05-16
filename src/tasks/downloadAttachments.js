import path from 'path';
import downloadFile from './downloadFile';
import { DIR_BY_TYPES } from './initDir';
import { fileSizeLimit } from '../config';
import logger from '../logger';
import processFileStreams from "./processFileStreams";

const AMOUNT_PAUSE = 5;

export default async function downloadAttachments(messages, userSession, dialogId, dialogType) {
    let tasks = [];
    const relativePath = path.join(DIR_BY_TYPES[dialogType], dialogId, 'files');

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
    
                tasks.push(downloadFile(file.url_private_download, relativePath, userSession, file.id, extName));
    
                // TODO: снимаю временно ограничение на кол-во файлов
                if (tasks.length >= AMOUNT_PAUSE) {
                    await processFileStreams(tasks, relativePath);
                    tasks = [];
                }
            } catch(e) {
                logger.error(`${e.stack}\nFile: ${JSON.stringify(file)}`);
            }
        }
    }

    return await processFileStreams(tasks, relativePath);
}

