import {buildApp} from '../src/app.js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

describe('Swagger Documentation', () => {
    let app;

    beforeAll(async () => {
        app = await buildApp({logger: false});
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /documentation/json', () => {
        it('should return OpenAPI specification', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const spec = JSON.parse(response.body);
            expect(spec.openapi).toBeDefined();
            expect(spec.info.title).toBe('HyperFormula Web Service');
            expect(spec.info.version).toBe('1.0.0');
        });

        it('should include all expected paths', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            const spec = JSON.parse(response.body);
            expect(Object.keys(spec.paths)).toContain('/health');
            expect(Object.keys(spec.paths)).toContain('/calculate');
        });

        it('should include security schemes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            const spec = JSON.parse(response.body);
            expect(spec.components.securitySchemes).toBeDefined();
            expect(spec.components.securitySchemes.apiKey).toBeDefined();
            expect(spec.components.securitySchemes.apiKey.type).toBe('apiKey');
            expect(spec.components.securitySchemes.apiKey.name).toBe('X-API-Key');
            expect(spec.components.securitySchemes.apiKey.in).toBe('header');
        });

        it('should include proper tags', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            const spec = JSON.parse(response.body);
            expect(spec.tags).toBeDefined();
            expect(spec.tags.some(tag => tag.name === 'Calculation')).toBe(true);
            expect(spec.tags.some(tag => tag.name === 'System')).toBe(true);
        });

        it('should have calculate endpoint with proper schema', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            const spec = JSON.parse(response.body);
            const calculateEndpoint = spec.paths['/calculate'].post;
            
            expect(calculateEndpoint).toBeDefined();
            expect(calculateEndpoint.summary).toBe('Execute Formula');
            expect(calculateEndpoint.tags).toContain('Calculation');
            expect(calculateEndpoint.requestBody).toBeDefined();
            expect(calculateEndpoint.responses).toBeDefined();
        });

        it('should have health endpoint with proper schema', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation/json'
            });

            const spec = JSON.parse(response.body);
            const healthEndpoint = spec.paths['/health'].get;
            
            expect(healthEndpoint).toBeDefined();
            expect(healthEndpoint.summary).toBe('Health Check');
            expect(healthEndpoint.tags).toContain('System');
            expect(healthEndpoint.responses).toBeDefined();
        });
    });

    describe('GET /documentation', () => {
        it('should serve Swagger UI', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/documentation'
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toMatch(/text\/html/);
            expect(response.body).toContain('swagger');
        });
    });
});