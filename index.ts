const server = Bun.serve({
    port: 3000,
    fetch(req: Request) {
      return new Response("Hello from Bun!");
    },
  });
  
  console.log(`Server running on http://localhost:${server.port}`);