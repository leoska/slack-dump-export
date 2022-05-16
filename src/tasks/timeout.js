export default function timeout(ms, rej = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => rej ? reject(new Error(`Timeout has reached!`)) : resolve(true), ms);
    });
}