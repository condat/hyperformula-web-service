import {CalculateRequestSchema, CalculateResponseSchema} from './schema.js';

export default async function (fastify, opts) {
    fastify.post('', {
        schema: {
            tags: ['Calculation'],
            summary: 'Execute Formula',
            description: 'Calculates a result based on an Excel-like formula.',
            body: CalculateRequestSchema,
            response: {
                200: CalculateResponseSchema,
                400: CalculateResponseSchema,
                422: CalculateResponseSchema,
                500: CalculateResponseSchema
            },
        },
    }, async (req, reply) => {
        try {
            const result = await fastify.workerPool.run(req.body);
            if (result.error) {
                const code = result.errorType === 'RESOURCE_LIMIT' ? 413 : 422;
                return reply.code(code).send({
                    status: 'error',
                    errorType: result.errorType,
                    message: result.message
                });
            }
            return reply.send({status: 'success', result: result.result});
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({status: 'error', message: 'Worker execution failed'});
        }
    });
}