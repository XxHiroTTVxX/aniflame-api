import { generateAndStoreKey } from '../../utils/key';
import { createResponse } from '../../lib/response';

export const handler = async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return createResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }
    try {
        const body = await req.json() as { name?: string, discordId?: string };
        const { name, discordId } = body;
        
        if (!name || !discordId) {
            return createResponse(JSON.stringify({ error: 'Name and Discord ID are required' }), 400);
        }

        const apiKey = await generateAndStoreKey(discordId, name);
        
        return createResponse(JSON.stringify({ 
            apiKey,
            name
        }), 200);
    } catch (error) {
        console.error('Error generating API key:', error);
        return createResponse(JSON.stringify({ error: 'Internal server error' }), 500);
    }
};

const route = {
    path: '/generate-key',
    handler,
    rateLimit: 1 // Limit to 1 request per minute to prevent abuse
};

export default route; 