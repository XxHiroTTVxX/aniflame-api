import axios from "axios";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";

const REQ_HEADERS = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": USER_AGENT,
  };

  

  
  export const client = axios.create({
    timeout: 20000,
    headers: {
      "Accept-Encoding": "gzip",
      ...REQ_HEADERS
    }
  })