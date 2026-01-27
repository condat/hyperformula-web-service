import dotenv from 'dotenv';
import { buildApp } from './app.js';

dotenv.config({ quiet: true });

const PORT = parseInt(process.env.PORT, 10) || 3000;

const start = async () => {
    const app = await buildApp({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
            transport: process.env.NODE_ENV !== 'production' ? {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
            } : undefined,
        }
    });

    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });

        const signals = ['SIGINT', 'SIGTERM'];
        for (const signal of signals) {
            process.on(signal, async () => {
                app.log.info(`Received ${signal}, shutting down...`);
                await app.close();
                process.exit(0);
            });
        }
    } catch (err) {
        console.error('Fatal error during startup:', err);
        process.exit(1);
    }
};

start();