# Routes Example

This document provides an example of how to use the routes module effectively in a server-side application. It demonstrates the creation of a custom route handler and how to define a route for it.

## Overview

The example showcases the use of a custom route handler that responds with a list of names. This is achieved by importing a utility function `createResponse` from a local library, defining an array of names, and then creating a route that uses this handler.

## Example

```ts
// Import the createResponse function
import { createResponse } from "../lib/response";

// Define an array of names
const names = [
  "Alice",
  "Bob",
  "Charlie",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Hannah",
  "Ivan",
  "Judy",
];

// Route handler
export const handler = async (req: Request): Promise<Response> => {
  // Return the names array as part of the response
  return createResponse(JSON.stringify({ names }));
};

// Define the route
const route = {
  path: "/info",
  handler,
  rateLimit: 60,
};

export default route;
```

### Explanation

- **Importing `createResponse`**: This utility function is imported from a local library. It's used to create a response object that can be returned by the route handler.
- **Defining `names`**: An array of names is defined. This array will be included in the response body.
- **Route Handler (`handler`)**: This is an asynchronous function that takes a `Request` object and returns a `Promise<Response>`. It uses `createResponse` to return a JSON response containing the `names` array.
- **Defining the Route (`route`)**: A route object is defined with the following properties:
- `path`: The URL path for the route. In this case, it's `/info`.
- `handler`: The route handler function defined earlier.
- `rateLimit`: An optional property that specifies the rate limit for this route. Here, it's set to 60, indicating that the route can handle up to 60 requests per minute.
- **Exporting the Route**: The route object is exported as the default export of the module, making it available for use in other parts of the application.

## Conclusion

This example demonstrates a basic yet effective way to define and use custom route handlers in a server-side application. By encapsulating the logic within a route handler and defining a route for it, you can easily manage and extend your application's routing capabilities.
