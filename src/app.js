import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import workerPoolPlugin from './plugins/worker-pool.js';
import calculateRoute from './routes/calculate/index.js';
import { swaggerConfig } from './config/swagger.js';

export async function buildApp(options = {}) {
    const app = Fastify({
        logger: options.logger || true,
        disableRequestLogging: true,
        bodyLimit: 1024 * 1024
    }).withTypeProvider();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((error, request, reply) => {
        if (error.validation) {
            return reply.status(400).send({
                status: 'error',
                error: 'Bad Request',
                message: error.message,
                details: error.validation
            });
        }
        request.log.error(error);
        reply.status(error.statusCode || 500).send({
            status: 'error',
            message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message
        });
    });

    await app.register(fastifyHelmet);
    await app.register(fastifyCors, { origin: process.env.CORS_ORIGIN || '*' });
    await app.register(workerPoolPlugin);
    await app.register(fastifySwagger, swaggerConfig);

    app.addHook('onRequest', async (req, reply) => {
        const publicRoutes = ['/documentation', '/health', '/static'];
        if (publicRoutes.some(path => req.url.startsWith(path))) return;

        const apiKey = process.env.API_KEY;
        if (!apiKey || req.headers['x-api-key'] !== apiKey) {
            return reply.code(401).send({
                status: 'error',
                errorType: 'UNAUTHORIZED',
                message: 'Invalid or missing API Key'
            });
        }
    });

    app.get('/health', {
        schema: { tags: ['System'], summary: 'Health Check' }
    }, async () => ({
        status: 'ok',
        uptime: process.uptime(),
        workers: app.workerPool.options.maxThreads
    }));

    await app.register(calculateRoute, { prefix: '/calculate' });
    await app.register(fastifySwaggerUi, { routePrefix: '/documentation' });

    return app;
}