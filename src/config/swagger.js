export const swaggerConfig = {
    openapi: {
        info: {
            title: 'HyperFormula Web Service',
            description: 'High-performance Excel-like formula calculation service.',
            version: '1.0.0'
        },
        components: {
            securitySchemes: {
                apiKey: {
                    type: 'apiKey',
                    name: 'X-API-Key',
                    in: 'header'
                }
            }
        },
        security: [{apiKey: []}],
        tags: [
            {name: 'Calculation', description: 'Core calculation endpoints'},
            {name: 'System', description: 'Health and status checks'}
        ]
    }
};