import colors from 'colors';

const configDefault = {
    userName: "", // Slack's user name
    token: "", // Slack's OAuth token
    fileSizeLimit: 10485760, // Default file size limit - 15mb
    downloadAvatars: true, // Download user's avatars (only originals)
    filter: {
        // Filter default settings for IMs
        ims: {
            enabled: true,
            timeStampLimit: 0,
            include: [],
            exclude: [],
            downloadFiles: true,
        },
        // Filter default settings for MPIMs
        mpims: {
            enabled: true,
            timeStampLimit: 0,
            include: [],
            exclude: [],
            downloadFiles: true,
        },
        // Filter default settings for Private Channels
        privateChannels: {
            enabled: true,
            timeStampLimit: 0,
            include: [],
            exclude: [],
            downloadFiles: true,
        },
        // Filter default settings for Public Channels
        publicChannels: {
            enabled: true,
            timeStampLimit: 0,
            include: [],
            exclude: [],
            downloadFiles: true,
        }
    }
};

let configObj = Object.assign({}, configDefault);

try {
    const configFile = require('./../settings.json');

    if (!configFile)
        throw new Error(`[Config] settings.json is undefined or null.`);

    if (!typeof(configFile) === 'object')
        throw new Error(`[Config] settings.json type is [${typeof(configFile)}] but expected object.`);

    configObj = Object.assign(configObj, configFile);
    console.log(colors.green(`[Config] settings.json successfully loaded.`));
} catch(e) {
    console.error(colors.red(e.stack));
}

const { userName, token, fileSizeLimit, downloadAvatars, filter } = configObj;

export { 
    userName, 
    token, 
    fileSizeLimit, 
    downloadAvatars, 
    filter,
};