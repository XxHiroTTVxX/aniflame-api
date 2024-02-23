import colors from 'colors';
export function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value) {
        if (defaultValue) {
            return defaultValue;
        }
        // Use colors to colorize s error message
        console.log(colors.red(`Environment variable ${key} is not set.`));
        return ''; // Return an empty string as a fallback
    }
    return value;
}