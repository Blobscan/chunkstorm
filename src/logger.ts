const getTimestamp = () => new Date().toISOString();

function formatContext(context: any): string {
    if (!context || typeof context !== 'object') return '';
    return Object.entries(context)
        .map(([key, value]) => `${key}=${formatValue(value)}`)
        .join(' ');
}

function formatValue(value: any): string {
    if (value instanceof Error) {
        return value.message;
    }
    if (typeof value === 'object') {
        return Array.isArray(value)
            ? `[${value.map(formatValue).join(', ')}]`
            : Object.entries(value)
                .map(([k, v]) => `${k}:${formatValue(v)}`)
                .join(', ');
    }
    return String(value);
}

export function log(context: any, message: string) {
    const formatted = formatContext(context);
    console.log(`\x1b[36m[INFO] [${getTimestamp()}]\x1b[0m ${message}${formatted ? ' | ' + formatted : ''}`);
}

export function error(context: any, message: string) {
    let logContext = context;
    if (context && context.err !== undefined) {
        logContext = { ...context, err: formatError(context.err) };
    }
    const formatted = formatContext(logContext);
    console.error(`\x1b[31m[ERROR] [${getTimestamp()}]\x1b[0m ${message}${formatted ? ' | ' + formatted : ''}`);
}

function formatError(err: unknown): string {
    if (err instanceof Error) {
        return err.stack || err.message;
    }
    if (typeof err === 'object') {
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
    return String(err);
}

