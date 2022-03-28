import fs from 'fs';

export const DIR_BY_TYPES = {
    PRIVATE_CHANNEL: 'private_channels',
    PUBLIC_CHANNEL: 'public_channels',
    MPIM: 'mpims',
    IM: 'ims',
}

export default async function initDir(dir) {
    await fs.promises.mkdir(`${process.cwd()}/data/${dir}`);

    await Promise.all([
        fs.promises.mkdir(`${process.cwd()}/data/${dir}/avatars`),
        fs.promises.mkdir(`${process.cwd()}/data/${dir}/public_channels`),
        fs.promises.mkdir(`${process.cwd()}/data/${dir}/private_channels`),
        fs.promises.mkdir(`${process.cwd()}/data/${dir}/mpims`),
        fs.promises.mkdir(`${process.cwd()}/data/${dir}/ims`),
    ]);
}