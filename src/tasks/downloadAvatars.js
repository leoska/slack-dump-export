import downloadFile from "./downloadFile";
import path from 'path';
import logger from "../logger";

const IMAGE_KEY = 'image_original';
const AMOUNT_PAUSE = 5;

export default async function downloadAvatars(users, userSession) {
    let tasks = [];

    for (const user of users) {
        const images = (Object.keys(user.profile) || []).filter((key) => key.indexOf(IMAGE_KEY) > -1);

        if (!images.length)
            continue;

        for (const image of images) {
            const extname = path.extname(user.profile[image]);

            tasks.push(downloadFile(user.profile[image], 'avatars', userSession, `${user.name}_${image}`, extname, false).then((fileName) => {
                logger.info(`File (avatars/${fileName}) [${user.name}_${image}] successfully downloaded!`);
            }, (e) => {
                logger.warn(`File (avatars/${user.name}_${image}${extname}) something went wrong: ${e.stack}`);
            }));

            if (tasks.length >= AMOUNT_PAUSE) {
                await Promise.all(tasks);
                tasks = [];
            }
        }
    }

    return await Promise.all(tasks);
}