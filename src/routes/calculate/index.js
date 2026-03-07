import {CalculateRequestSchema, CalculateResponseSchema} from './schema.js';

export default async function (fastify, opts) {
    fastify.post('', {
        schema: {
            tags: ['Calculation'],
            summary: 'Execute Formula',
            description: 'Calculates a result based on an Excel-like formula.\n\n## Examples\n\n### Simple Calculation\n```json\n{\n  "formula": "2 * (3 + 4)"\n}\n```\n\n### Using Variables\n```json\n{\n  "formula": "#Price * #Quantity",\n  "variables": {\n    "Price": 100,\n    "Quantity": 5\n  }\n}\n```\n\n### IF Function\n```json\n{\n  "formula": "IF(#Age >= 18, \\"Adult\\", \\"Minor\\")",\n  "variables": {\n    "Age": 25\n  }\n}\n```\n\n### VLOOKUP with Table\n```json\n{\n  "formula": "VLOOKUP(#Product, Products, 2, FALSE)",\n  "variables": {\n    "Product": "Apple"\n  },\n  "lookupTables": {\n    "Products": [\n      [\"Product\", \"Price\"],\n      [\"Apple\", 1.5],\n      [\"Banana\", 0.75]\n    ]\n  }\n}\n```',
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