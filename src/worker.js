import {HyperFormula} from 'hyperformula';
import crypto from 'crypto';

const MAX_TOTAL_CELLS = 50000;
const HF_CONFIG = {
    licenseKey: 'gpl-v3',
    useColumnIndex: false,
    useStats: false,
    useArrayArithmetic: true
};

const toExcelDate = (dateInput) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 1000 * 60 * 60 * 24;
    return (date.getTime() - excelEpoch.getTime()) / msPerDay;
};

const getColLetter = (colIdx) => {
    let label = '';
    while (colIdx >= 0) {
        label = String.fromCharCode((colIdx % 26) + 65) + label;
        colIdx = Math.floor(colIdx / 26) - 1;
    }
    return label;
};

const formatValueForExpression = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
            const excelDate = toExcelDate(value);
            if (excelDate !== null) return excelDate;
        }
        return `"${value.replace(/"/g, '""')}"`;
    }
    return `"${String(value).replace(/"/g, '""')}"`;
};

const registerLookupTables = (hf, tables) => {
    if (!tables) return 0;
    let cellCount = 0;

    for (const [tableName, data] of Object.entries(tables)) {
        if (Array.isArray(data) && data.length > 0 && data[0].length > 0) {
            const rows = data.length;
            const cols = data[0].length;
            cellCount += rows * cols;

            const safeSheetName = tableName.replace(/[^a-zA-Z0-9_]/g, '_');

            if (!hf.doesSheetExist(safeSheetName)) {
                hf.addSheet(safeSheetName);
            }

            const sheetId = hf.getSheetId(safeSheetName);
            hf.setSheetContent(sheetId, data);

            const lastCol = getColLetter(cols - 1);
            const range = `'${safeSheetName}'!$A$1:$${lastCol}$${rows}`;

            const safeExpressionName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
            hf.addNamedExpression(safeExpressionName, `=${range}`);
        }
    }
    return cellCount;
};

const registerVariables = (hf, variables) => {
    if (!variables) return {varMap: new Map(), count: 0};

    const varMap = new Map();
    const keys = Object.keys(variables);

    for (const key of keys) {
        const hash = crypto.createHash('md5').update(key).digest('hex').substring(0, 6);
        const internalName = `VAR_${key.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`.toUpperCase();

        const expressionValue = formatValueForExpression(variables[key]);

        try {
            hf.addNamedExpression(internalName, `=${expressionValue}`);
            varMap.set(key, internalName);
        } catch (e) {
            throw new Error(`Failed to register variable '${key}': ${e.message}`);
        }
    }
    return {varMap, count: keys.length};
};

export default async function calculate({formula, variables, lookupTables}) {
    let hfInstance = null;

    try {
        hfInstance = HyperFormula.buildEmpty(HF_CONFIG);

        hfInstance.addNamedExpression('TRUE', '=TRUE()');
        hfInstance.addNamedExpression('FALSE', '=FALSE()');

        const tableCells = registerLookupTables(hfInstance, lookupTables);
        const {varMap, count: varCount} = registerVariables(hfInstance, variables);

        if ((tableCells + varCount) > MAX_TOTAL_CELLS) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: Max cells allowed: ${MAX_TOTAL_CELLS}`);
        }

        let processedFormula = formula;

        if (varMap.size > 0) {
            const sortedKeys = [...varMap.keys()].sort((a, b) => b.length - a.length);

            for (const userKey of sortedKeys) {
                const internalName = varMap.get(userKey);
                processedFormula = processedFormula.split(`#${userKey}`).join(internalName);
            }
        }

        if (!processedFormula.startsWith('=')) processedFormula = '=' + processedFormula;

        const sheetName = 'Calculation_Sheet';
        hfInstance.addSheet(sheetName);
        const sheetId = hfInstance.getSheetId(sheetName);

        hfInstance.setCellContents(
            {sheet: sheetId, row: 0, col: 0},
            [[processedFormula]]
        );

        const result = hfInstance.getCellValue({sheet: sheetId, row: 0, col: 0});

        if (result && typeof result === 'object' && result.type) {
            return {
                error: true,
                errorType: result.type,
                message: result.message || 'Calculation error occurred in engine.'
            };
        }

        return {
            success: true,
            result: result
        };

    } catch (error) {
        return {
            error: true,
            errorType: error.message.includes('RESOURCE_LIMIT') ? 'RESOURCE_LIMIT' : 'INTERNAL_ERROR',
            message: error.message
        };
    } finally {
        if (hfInstance) {
            hfInstance.destroy();
        }
    }
}