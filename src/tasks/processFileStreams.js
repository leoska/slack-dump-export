import logger from "../logger";
import path from "path";

/**
 * Process all tasks (file streams)
 * 
 * @async
 * @param {Array<Promise>} tasks
 * @param {String} relativePath
 * @returns {Promise<void>}
 */
export default async function processFileStreams(tasks, relativePath) {
    const results = await Promise.allSettled(tasks);
    const subTasks = [];

    for (const result of results) {
        if (result.status === "fulfilled") {
            subTasks.push(result.value().then(successfullyLogger, rejectedLogger));
        } else if (result.status === "rejected") {
            logger.warn(`File (${path.join(relativePath, `${result.reason?.file?.id}${result.reason?.file?.extension}`)}) something went wrong: ${result.reason?.stack}`);
        }
    }
    
    await Promise.all(subTasks);
}

/**
 * Function logger for successfully downloaded file (file stream function)
 * 
 * @param {String} fName
 * @returns {void}
 */
function successfullyLogger(fName) {
    logger.info(`File (${fName}) successfully downloaded!`);
}

/**
 * Function logger for rejected file stream function
 * 
 * @param {Error} e
 * @returns {void}
 */
function rejectedLogger(e) {
    logger.warn(`File (${e?.file?.fName}) something went wrong: ${e.stack}`);
}