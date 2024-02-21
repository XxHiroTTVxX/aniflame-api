import dotenv from 'dotenv';
import colors from 'colors';

dotenv.config();

const server = Bun.serve({
  port: process.env.PORT || 8080,
    fetch(req: Request) {
      return new Response("Hello Welcome to Aniflame API");
    },
  });
  
  console.log(colors.blue(`Server is now listening on http://localhost:${server.port}`));