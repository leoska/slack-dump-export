import { MongoClient } from 'mongodb';
import logger from "./logger";
import { mongo } from './config';

/**
 * Получение нового монго клиента
 *
 * @returns {MongoClient}
 */
function getMongoClient() {
    const host = mongo.host || 'mongodb';
    const port = mongo.port || 27017;
    const db = mongo.db || 'slack';
    
    return new MongoClient(`mongodb://${host}:${port}/${db}`,{
        useNewUrlParser: true, 
        useUnifiedTopology: true
    });
}

let mongoConnect = getMongoClient();
let connected = false;

process.once('exit', async () => {
    connected && await mongoConnect.close();
})

/**
 * Save data to mongo
 * 
 * @param {String} collectionName
 * @param {(Array<Object>)}data
 * @returns {Promise<void>}
 */
export async function saveToMongo(collectionName, data) {
    if (!Array.isArray(data) || !data.length)
        return;
    
    const dbConnect = await getConnect();
    
    const collection = dbConnect.db(mongo.db || 'slack').collection(collectionName);
    logger.log(`[saveToMongo] MongoDb started save data of channel [${collectionName}]`);
    
    try {
        await collection.insertMany(data, { ordered : false });
        logger.log(`[saveToMongo] MongoDb successfully saved data of channel [${collectionName}]`);
    } catch(e) {
        // Update duplicates
        if (e.code === 11000){
            const insertedIds = e.result.result.insertedIds;
            const tasks = [];
            logger.warn(`[saveToMongo] MongoDb duplicate key error collection [${collectionName}]. Just try update. Ids: [${insertedIds.map((item) => item._id)}]`);

            const dic = {}; 
            for (const item of data) {
                dic[item._id] = item;
            }
            
            for (const insertedId of insertedIds) {
                tasks.push(collection.updateOne({_id: insertedId._id}, {$set: dic[insertedId._id]}));
            }
            
            await Promise.all(tasks);
            logger.info(`[saveToMongo] MongoDb duplicate key error collection [${collectionName}] successfully updated.`);
            return;
        }
        
        throw e;
    }

}

/**
 * Get last stamp (last message time) from channel
 * 
 * @async
 * @param {String} channelId
 * @returns {Promise<Number>}
 */
export async function getLastStampMessage(channelId) {
    const dbConnect = await getConnect();

    const collection = dbConnect.db(mongo.db || 'slack').collection(channelId);
    const msg = await collection.find().sort({ts: -1}).limit(1).toArray();
    
    if (!Array.isArray(msg) || !msg.length)
        return 0;
    
    return msg[0].ts || 0;
}

/**
 * Get all users from mongoDb
 * 
 * @async
 * @returns {Promise<Array<*>>}
 */
export async function getUsers() {
    const dbConnect = await getConnect();

    const collection = dbConnect.db(mongo.db || 'slack').collection('users');
    return await collection.find().toArray();
}

/**
 * 
 * @param user
 * @returns {Promise<*>}
 */
export async function updateUser(user) {
    const dbConnect = await getConnect();

    const collection = dbConnect.db(mongo.db || 'slack').collection('users');
    return await collection.updateOne({_id: user.id}, {$set: user});
}

/**
 * Get connection for mongoDb
 * 
 * @async
 * @returns {Promise<*>}
 */
async function getConnect() {
    if (!connected) {
        await mongoConnect.connect();

        mongoConnect.on('error', async (e) => {
            logger.error(`[MongoDb] Something went wrong: ${e.stack}`);
            
            try {
                await mongoConnect.close();
            } catch(e) {
                logger.warn(`[MongoDb] Something went wrong on try to close connection: ${e.stack}`);
            }

            connected = false;
            mongoConnect = getMongoClient();
            mongoConnect = await getConnect();
        });
        
        mongoConnect.on('close', () => logger.info(`[MongoDb] Connection was closed.`));
        connected = true;
        
        logger.info(`[saveToMongo -> getConnect] Mongo has successfully connected!`);
    }
    
    return mongoConnect;
}