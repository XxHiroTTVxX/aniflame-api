import dotenv from 'dotenv';

dotenv.config();

const server = Bun.serve({
  port: process.env.PORT || 8080,
    fetch(req: Request) {
      return new Response("Hello Welcome to Aniflame API");
    },
  });
  
  console.log(`Server running on http://localhost:${server.port}`);