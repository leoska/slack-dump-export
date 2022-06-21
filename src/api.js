import axios from 'axios';
import { token } from "./config";
import timeout from './tasks/timeout';
import logger from './logger';

// Таймаут запроса
const TIMEOUT_ATTEMPT_CALL_API = 120000;
const BASE_URL = `https://slack.com/api/`;

const AMOUNT_ATTEMPT_COUNT = 3;
const DEFAULT_RETRY_AFTER = 3600;

export default async function api(endpoint, method = 'get', params = {}, amountTry = 0) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            params,
            responseType: 'json',
            responseEncoding: 'utf-8',
            timeout: TIMEOUT_ATTEMPT_CALL_API,
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                "Authorization": `Bearer ${token}`,
            },
        }

        const res = await axios(config);
        const data = res.data;

        if (data.ok) {
            logger.log(`[${endpoint}] Data retrieved OK. Response code: ${res.status}, status text: ${res.statusText}`);
            return data;
        } else {
            logger.error(`[${endpoint}] Something went wrong. Error: ${data.error}. Data: ${JSON.stringify(data)}`);
            throw new Error(`[${endpoint}] Something went wrong. Error: ${data.error}`);
        }
    } catch(e) {
        // Timeout has reached (try again)
        if (e.message.indexOf('timeout of') > -1) {
            if (amountTry < AMOUNT_ATTEMPT_COUNT) {
                logger.warn(`Api [${endpoint}] has reached timeout, try again to call. Attempt: [${++amountTry}]`);
                await timeout(50);
                return await api(endpoint, method, params, amountTry);
            }
        }
        
        // 429 Too Many Requests
        if (e.response && e.response.status === 429) {
            if (amountTry < AMOUNT_ATTEMPT_COUNT) {
                logger.warn(`Api [${endpoint}] has status code 429, try again to call. Attempt: [${++amountTry}]`);
                await timeout(e.response.headers && e.response.headers['retry-after'] || DEFAULT_RETRY_AFTER);
                return await api(endpoint, method, params, amountTry);
            }
        }

        logger.error(`[Api -> ${endpoint}] (${BASE_URL}${endpoint}) Something went wrong. ${e.stack}`);
        throw e;
    }
}