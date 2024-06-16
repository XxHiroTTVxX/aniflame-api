import colors from 'colors';

export function getEnvVar(key: string, defaultValue?: string): string {
    const value = Bun.env[key];
    if (!value) {
        const errorMessage = `Environment variable ${key} is not set.`;
        console.error(colors.red(errorMessage));
        return defaultValue || '';
    }
    return value;
}