/**
 * Creates a response with the given data, status code, and headers.
 * Inspired by and adapted from Anify's response implementation: https://github.com/Eltik/Anify/blob/main/anify-backend/src/server/lib/response.ts
 * 
 * @param data - The response data
 * @param status - The HTTP status code (default: 200)
 * @param headers - Additional headers to include
 * @returns A Response object with appropriate headers and status
 */
export const createResponse = (data: any, status: number = 200, headers: { [key: string]: string } = {}) => {
    return new Response(data, {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Max-Age": "2592000",
            "Access-Control-Allow-Headers": "*",
            ...headers,
        },
    });
}