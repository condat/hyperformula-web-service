import {buildApp} from '../src/app.js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const API_KEY = process.env.API_KEY || 'my-secret-key-123';

describe('POST /calculate', () => {
    let app;

    beforeAll(async () => {
        app = await buildApp({logger: false});
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return 401 if no API key is provided', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            payload: {formula: '1+1'}
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.errorType).toBe('UNAUTHORIZED');
    });

    it('should return 400 if validation fails (missing formula)', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {variables: {a: 1}}
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Bad Request');
    });

    it('should return 400 for invalid variable names', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: '#Invalid-Name',
                variables: {'Invalid-Name': 10}
            }
        });
        expect(response.statusCode).toBe(400);
    });

    it('should correctly calculate a simple formula', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {formula: '2 * (3 + 4)'}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('success');
        expect(body.result).toBe(14);
    });

    it('should handle variables with #syntax', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: "(#Datenschutz + #Risiko * 5) / 2",
                variables: {
                    "Datenschutz": 7,
                    "Risiko": 3
                }
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe(11);
    });

    it('should perform VLOOKUP with lookup tables', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: "VLOOKUP(#Score, Table, 2, TRUE)",
                variables: {"Score": 7.5},
                lookupTables: {
                    "Table": [
                        [0, "Low"],
                        [7, "Medium"],
                        [9, "High"]
                    ]
                }
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe('Medium');
    });

    it('should handle VLOOKUP with exact match', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: "VLOOKUP(#ID, Products, 2, FALSE)",
                variables: {"ID": "B-102"},
                lookupTables: {
                    "Products": [
                        ["A-101", "Widget"],
                        ["B-102", "Gadget"],
                        ["C-103", "Thingamajig"]
                    ]
                }
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe('Gadget');
    });

    it('should return 422 for calculation errors (Div/0)', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {formula: '1/0'}
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('error');
        expect(body.errorType).toBe('DIV_BY_ZERO');
    });

    it('should return 422 for unknown functions', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {formula: 'UNKNOWN_FUNC(1, 2)'}
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body);
        expect(body.errorType).toBe('NAME');
    });

    it('should detect circular references', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {formula: 'A1 + 1'}
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body);
        expect(body.errorType).toBe('CYCLE');
    });

    it('should handle missing variables gracefully', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: '#Vorhanden * #Fehlt',
                variables: {Vorhanden: 10}
            }
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body);

        expect(['NAME', 'ERROR']).toContain(body.errorType);
    });

    it('should handle Date logic (TODAY/Comparison)', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: 'IF(DATE(2025,1,1) > DATE(2024,1,1), "Future", "Past")'
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe("Future");
    });

    it('should handle complex array formulas', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: 'SUMPRODUCT({2, 3}, {10, 20})',
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe(80);
    });

    it('should handle string concatenation correctly', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: '"Status: " & IF(#Score > 50, "Pass", "Fail")',
                variables: {Score: 80}
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe('Status: Pass');
    });

    it('should evaluate complex logical nesting (AND/OR)', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: 'IF(AND(#Age >= 18, OR(#Member = TRUE, #HasTicket = TRUE)), "Allowed", "Denied")',
                variables: {
                    Age: 20,
                    Member: false,
                    HasTicket: true
                }
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toBe('Allowed');
    });

    it('should return 422 when resource limits are exceeded', async () => {
        const largeTable = Array.from({ length: 1000 }, () => Array.from({ length: 60 }, () => 1));
        const response = await app.inject({
            method: 'POST',
            url: '/calculate',
            headers: {'X-API-Key': API_KEY},
            payload: {
                formula: '1+1',
                lookupTables: { "Large": largeTable }
            }
        });
        expect([413, 422]).toContain(response.statusCode);
        const body = JSON.parse(response.body);
        expect(body.errorType).toBe('RESOURCE_LIMIT');
    });
});


describe('GET /methods', () => {
    let app;

    beforeAll(async () => {
        app = await buildApp({logger: false});
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return 401 if no API key is provided', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods'
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.errorType).toBe('UNAUTHORIZED');
    });

    it('should return a list of available methods', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods',
            headers: {'X-API-Key': API_KEY}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('success');
        expect(body.methods).toBeDefined();
        expect(Array.isArray(body.methods)).toBe(true);
        expect(body.count).toBeGreaterThan(300);
        expect(body.categories).toBeDefined();
        expect(Array.isArray(body.categories)).toBe(true);
    });

    it('should include common functions like IF, SUM, and VLOOKUP', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods',
            headers: {'X-API-Key': API_KEY}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        const methodNames = body.methods.map(m => m.name);
        
        expect(methodNames).toContain('IF');
        expect(methodNames).toContain('SUM');
        expect(methodNames).toContain('VLOOKUP');
        expect(methodNames).toContain('AVERAGE');
        expect(methodNames).toContain('TODAY');
    });

    it('should return method details with correct structure', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods',
            headers: {'X-API-Key': API_KEY}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        
        // Check that methods have required fields
        const ifMethod = body.methods.find(m => m.name === 'IF');
        expect(ifMethod).toBeDefined();
        expect(ifMethod.category).toBeDefined();
        expect(ifMethod.description).toBeDefined();
        expect(ifMethod.syntax).toBeDefined();
        expect(Array.isArray(ifMethod.parameters)).toBe(true);
        expect(Array.isArray(ifMethod.examples)).toBe(true);
    });

    it('should categorize methods correctly', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods',
            headers: {'X-API-Key': API_KEY}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        
        const ifMethod = body.methods.find(m => m.name === 'IF');
        expect(ifMethod.category).toBe('Logical');
        
        const sumMethod = body.methods.find(m => m.name === 'SUM');
        expect(sumMethod.category).toBe('Math');
        
        const vlookupMethod = body.methods.find(m => m.name === 'VLOOKUP');
        expect(vlookupMethod.category).toBe('Lookup & Reference');
    });

    it('should provide examples for common functions', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/methods',
            headers: {'X-API-Key': API_KEY}
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        
        const ifMethod = body.methods.find(m => m.name === 'IF');
        expect(ifMethod.examples.length).toBeGreaterThan(0);
        expect(ifMethod.examples.some(ex => ex.includes('IF('))).toBe(true);
        
        const sumMethod = body.methods.find(m => m.name === 'SUM');
        expect(sumMethod.examples.length).toBeGreaterThan(0);
        expect(sumMethod.examples.some(ex => ex.includes('SUM('))).toBe(true);
    });
});