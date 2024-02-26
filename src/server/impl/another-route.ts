
export const handler = async (req: Request): Promise<Response> => {
    return new Response(JSON.stringify({ message: "Welcome to Another Route!" }), {
        status:  200,
        headers: { 'Content-Type': 'application/json' },
    });
};

const route = {
    path: "/another-route",
    handler,
    rateLimit: 60,
};

export default route;