import axios from 'axios';
import { token } from "./config";
import logger from './logger';

// Таймаут запроса
const TIMEOUT_ATTEMPT_CALLAPI = 40000;

/**
 * Check OAuth slack's token validation 
 * 
 * @async
 * @returns {Promise<String>} 
 */
export default async function auth() {
    try {
        const config = {
            responseType: 'json',
            responseEncoding: 'utf-8',
            timeout: TIMEOUT_ATTEMPT_CALLAPI,
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
        }

        const res = await axios.post('https://slack.com/api/auth.test', `token=${token}`, config);
        const data = res.data;

        if (data.ok) {
            logger.log(`Successfully authenticated for team ${data.team} (ID ${data.team_id}) and user ${data.user} (ID ${data.user_id})`);
            return true;
        } else {
            throw new Error(`[Auth] Something went wrong. Error: ${data.error}. Data: ${JSON.stringify(data)}`);
        }
    } catch(e) {
        throw e;
    }
}