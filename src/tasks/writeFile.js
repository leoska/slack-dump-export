import fs from 'fs';
import path from 'path';

/**
 * Write data to file (asynchronous)
 * 
 * @param {String} fileName
 * @param {any} data
 * @param {String} dir
 * @param {String} [extname]
 * @param {String} [encoding]
 * @returns {Promise<unknown>}
 */
export default function writeFile(fileName, data, dir, extname = 'json', encoding = 'utf8') {
    return new Promise((resolve, reject) => {
        try {
            const basePath = path.resolve(process.cwd(), 'data', dir);

            fs.access(basePath, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                const fName = `${fileName}${extname ? `.${extname}` : ''}`;
                const filePath = path.resolve(basePath, fName);

                fs.writeFile(filePath, await convertBigJSONtoString(data), { encoding }, (err) => {
                    if (err)
                        throw err;
    
                    resolve(true);
                });
            });
        } catch(e) {
            reject(e);
        }
    });
}

/**
 * Asynchronous JSON.stringify big string 
 * 
 * @async
 * @param {any} object 
 * @returns {String}
 */
async function convertBigJSONtoString(object) {
    if (!object)
        return '{}';
    
    return new Promise((resolve, reject) => {
        setImmediate(async () => {
            try {
                let result = '';

                if (Array.isArray(object)) {
                    result = "[";

                    for (let i = 0; i < object.length - 1; ++i)
                        result += await convertBigJSONtoString(object[i]) + ",";

                    result += await convertBigJSONtoString(object[object.length - 1]) + "]";
                } else if (typeof(object) === 'object') {
                    result = "{";

                    const items = Object.entries(object);
                    for (let i = 0; i < items.length - 1; ++i)
                        result += `"${items[i][0]}":${await convertBigJSONtoString(items[i][1])},`;

                    result += `"${items[items.length - 1][0]}":${await convertBigJSONtoString(items[items.length - 1][1])}}`;
                } else {
                    result = JSON.stringify(object);
                }
                resolve(result);
            } catch(e) {
                reject(e);
            }
        });
    });
}