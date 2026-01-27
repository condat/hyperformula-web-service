import fp from 'fastify-plugin';
import Piscina from 'piscina';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { availableParallelism } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default fp(async (fastify) => {
    const maxThreads = process.env.WORKER_THREADS
        ? parseInt(process.env.WORKER_THREADS, 10)
        : Math.min(availableParallelism(), 4);

    const pool = new Piscina({
        filename: resolve(__dirname, '../worker.js'),
        maxThreads: maxThreads,
        idleTimeout: 30000
    });

    fastify.decorate('workerPool', pool);

    fastify.addHook('onClose', async (instance) => {
        await instance.workerPool.destroy();
    });
});