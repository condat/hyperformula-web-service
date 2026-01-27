import z from 'zod';

const ValidVariableName = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: "Variable names must start with a letter or underscore, and contain only letters, numbers, or underscores."
});

export const CalculateRequestSchema = z.object({
    formula: z.string().min(1).describe('Excel-like formula. Use #variable syntax to reference variables (e.g., `#Price * #Quantity`).'),
    variables: z.record(ValidVariableName, z.union([z.string(), z.number(), z.boolean()])).optional().describe('Key-Value map of variables used in the formula.'),
    lookupTables: z.record(z.string(), z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))).optional().describe('Named tables for VLOOKUP operations'),
});

export const CalculateResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    result: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    errorType: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
    details: z.any().optional()
});