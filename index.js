import appProcess from './src/app';
import initDir from './src/tasks/initDir';
import logger, { initLog } from './src/logger';
import { userName } from './src/config';

const ARGV_USER_NAME = process.argv[2] || '';

try {
    (async () => {
        let userSession = ``;
        if (userName) {
            userSession = `${userName}_${Date.now()}`;
        } else if (ARGV_USER_NAME) {
            userSession = `${ARGV_USER_NAME}_${Date.now()}`;
        } else {
            userSession = `noname_${Date.now()}`;
        }

        await initDir(userSession);
        initLog(userSession);

        await appProcess(userSession);
    })().catch((e) => {
        logger.error(e.stack);
        return Promise.reject(e);
    });
} catch(e) {
    console.error(`Application can't start corrent: ${e.stack}`);
    process.exit(1);
}