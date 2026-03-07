import z from 'zod';

export const ArgumentSchema = z.object({
    name: z.string().describe('Argument name'),
    type: z.string().describe('Argument type (e.g., STRING, NUMBER, BOOLEAN, ANY)'),
    optional: z.boolean().describe('Whether the argument is optional'),
    description: z.string().optional().describe('Argument description')
}).describe('Function argument definition');

export const MethodSchema = z.object({
    name: z.string().describe('Function name (e.g., SUM, IF, VLOOKUP)'),
    category: z.string().describe('Function category (e.g., Math, Logical, Lookup)'),
    description: z.string().optional().describe('Brief description of what the function does'),
    syntax: z.string().describe('Function syntax signature'),
    parameters: z.array(ArgumentSchema).describe('Function parameters'),
    examples: z.array(z.string()).describe('Example formulas using this function'),
    isVolatile: z.boolean().optional().describe('Whether the function recalculates on every change')
}).describe('Available HyperFormula method definition');

export const MethodsResponseSchema = z.object({
    status: z.enum(['success', 'error']).describe('Response status'),
    methods: z.array(MethodSchema).describe('List of available methods'),
    count: z.number().describe('Total number of available methods'),
    categories: z.array(z.string()).describe('Available method categories')
}).describe('Response schema for methods list endpoint');
