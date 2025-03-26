import colors from 'colors';

/**
 * Utility function to safely retrieve environment variables
 * @param key The name of the environment variable
 * @param defaultValue Optional default value if the environment variable is not set
 * @returns The environment variable value or the default value
 */
export function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            console.log(colors.yellow(`Environment variable ${key} not found, using default value: ${defaultValue}`));
            return defaultValue;
        }
        console.log(colors.red(`Environment variable ${key} not found and no default value provided!`));
        return '';
    }
    console.log(colors.green(`Using environment variable ${key}: ${value}`));
    return value;
}

