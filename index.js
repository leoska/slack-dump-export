import appProcess from './src/app';
import Daemon from "./src/daemon";
import initDir from './src/tasks/initDir';
import logger, { initLog } from './src/logger';
import { userName, autoUpdate } from './src/config';

const ARGV_USER_NAME = process.argv[2] || '';
let daemon;

try {
    (async () => {
        let userSession;
        if (userName) {
            userSession = `${userName}_${Date.now()}`;
        } else if (ARGV_USER_NAME) {
            userSession = `${ARGV_USER_NAME}_${Date.now()}`;
        } else {
            userSession = `noname_${Date.now()}`;
        }

        await initDir(userSession);
        initLog(userSession);

        if (autoUpdate.enabled) {
            daemon = new Daemon(userSession);
        } else {
            await appProcess(userSession);
        }
    })().catch((e) => {
        logger.error(e.stack);
        return Promise.reject(e);
    });
} catch(e) {
    console.error(`Application can't start correct: ${e.stack}`);
    process.exit(1);
}