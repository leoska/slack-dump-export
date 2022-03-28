import fs from 'fs';
import util from 'util';
import path from 'path';
import colors from 'colors';

let logFile;
let errorFile;
let initialized = false;

/**
 * Initialize file streams for stdout log and stderr log
 * 
 * @param {String} userSession 
 * @returns {void}
 */
export function initLog(userSession) {
    const basePath = path.resolve(process.cwd(), 'data', userSession);

    const fLogName = path.join(basePath, 'stdout.log');
    const fErrorName = path.join(basePath, 'stderr.log');

    logFile = fs.createWriteStream(fLogName, { flags: 'a' });
    errorFile = fs.createWriteStream(fErrorName, { flags: 'a' });

    process.once('SIGINT', () => closeStreams(logFile, errorFile));

    process.once('beforeExit', () => closeStreams(logFile, errorFile));

    initialized = true;
}

function closeStreams(logFile, errorFile) {
    try {
        logFile.end();
    } catch(e) {
        console.error(colors.red(e.stack));
    }

    try {
        errorFile.end();
    } catch(e) {
        console.error(colors.red(e.stack));
    }
}

/**
 * Just checker for initialize logger
 */
function _checkInit() {
    if (!initialized)
        throw new Error(`Cannot write to file. Need initialize logger first.`);
}

export default {
    log: function () {
        const str = util.format.apply(null, arguments);
        try {
            _checkInit();
            logFile.write(`${(new Date().toISOString())} ${str}\n`);
        } catch(e) {
            console.error(colors.red(e.stack));
        } finally {
            console.log(colors.green(str));
        }
    },

    info: function () {
        const str = util.format.apply(null, arguments);
        try {
            _checkInit();
            logFile.write(`${(new Date().toISOString())} ${str}\n`);
        } catch(e) {
            console.error(colors.red(e.stack));
        } finally {
            console.info(colors.blue(str));
        }
    },

    warn: function () {
        const str = util.format.apply(null, arguments);
        try {
            _checkInit();
            errorFile.write(`${(new Date().toISOString())} ${str}\n`);
        } catch(e) {
            console.error(colors.red(e.stack));
        } finally {
            console.warn(colors.yellow(str));
        }
    },

    error: function (...args) {
        const str = util.format.apply(null, arguments);
        try {
            _checkInit();
            errorFile.write(`${(new Date().toISOString())} ${str}\n`);
        } catch(e) {
            console.error(colors.red(e.stack));
        } finally {
            console.error(colors.red(str));
        }
    },
}
