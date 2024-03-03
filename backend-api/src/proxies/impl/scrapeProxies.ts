import colors from "colors";
import dotenv from "dotenv";
import { getEnvVar } from "../../utils/envUtils";
import { checkCorsProxies } from "./checkProxies";

dotenv.config();

export async function scrapeCorsProxies(): Promise<string> {
    const censysId = getEnvVar('CENSYS_ID');
    const censysSecret = getEnvVar('CENSYS_SECRET');
    const MAX_REQUESTS =  10000;

    if (!censysId || !censysSecret) {
        return colors.red("ERROR") + ": CENSYS_ID or CENSYS_SECRET not provided.";    
    }
    const proxies: { ip: string; port: number }[] = [];
    let cursor: string | null = null;
    let currentRequest =  0;

    console.log(colors.yellow("Searching for proxies on Censys..."));

    try {
        do {
            const data = await search("c7d96235df80ea051e9d57f3ab6d3e4da289fd3b", cursor);
            if (!data || !data.result || !data.result.hits) {
                break;
            }

            // Process hits more efficiently
            data.result.hits.forEach(hit => {
                hit.services.forEach(service => {
                    if (service.extended_service_name === "HTTP" || service.extended_service_name === "HTTPS") {
                        proxies.push({ ip: hit.ip, port: service.port });
                    }
                });
            });

            console.log(colors.gray("Fetched ") + colors.blue(proxies.length + "") + colors.gray(" hits so far."));

            cursor = data.result.links.next;
            currentRequest++;

            if (cursor === null || cursor === "" || currentRequest >= MAX_REQUESTS) {
                console.log(colors.green("Finished scraping CORS proxies."));
                await Bun.write("./proxies.json", JSON.stringify(proxies, null,   4));
                await checkCorsProxies();
                break;
            }
        } while (cursor !== null && cursor !== "" && currentRequest < MAX_REQUESTS);

        console.log(colors.green("Finished scraping CORS proxies."));
        await Bun.write("./proxies.json", JSON.stringify(proxies, null,   4));
        await checkCorsProxies();
        return "Scraping completed successfully.";
    } catch (error) {
        console.error(colors.red("An error occurred while scraping CORS proxies:"), error);
        return Promise.reject("An error occurred while scraping CORS proxies.");
    }
}
async function search(q: string, cursor: string | null = null): Promise<Root | undefined> {
    const censysId = getEnvVar('CENSYS_ID');
    const censysSecret = getEnvVar('CENSYS_SECRET');
    const appendCursor = cursor ? `&cursor=${cursor}` : "";

    const url = "/hosts/search?q=" + q + `&per_page=100&virtual_hosts=EXCLUDE` + appendCursor;

    if (!censysId || !censysSecret) {
        console.log(colors.yellow("CENSYS_ID or CENSYS_SECRET not found in .env file. Please add them to scrape CORS proxies."));
        return undefined;
    }

    const apiID = censysId ?? "d973cf60-4ce4-4746-962b-815ddfdebf80",
        apiSecret = censysSecret ?? "s6EUuA4Sfaajd8jDBJ17b4DaoPofjDe6";

    const auth = "Basic " + Buffer.from(apiID + ":" + apiSecret).toString("base64");
    const headers = { Authorization: auth };

    try {
        const response = await fetch(`https://search.censys.io/api/v2${url}`, { headers: headers });

        return await response.json() as Root;
    }
    catch (error) {
        console.error(error);
        return undefined;
    }
}

interface Root {
    code: number;
    status: string;
    result: Result;
}

interface Result {
    query: string;
    total: number;
    duration: number;
    hits: Hit[];
    links: Links;
}

interface Hit {
    ip: string;
    services: Service[];
    location: Location;
    autonomous_system: AutonomousSystem;
    last_updated_at: string;
    dns?: Dns;
}

interface Service {
    port: number;
    service_name: string;
    extended_service_name: string;
    transport_protocol: string;
    certificate?: string;
}

interface Location {
    continent: string;
    country: string;
    country_code: string;
    city: string;
    postal_code?: string;
    timezone: string;
    coordinates: Coordinates;
    province?: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface AutonomousSystem {
    asn: number;
    description: string;
    bgp_prefix: string;
    name: string;
    country_code: string;
}

interface Dns {
    reverse_dns: ReverseDns;
}

interface ReverseDns {
    names: string[];
}

interface Links {
    next: string;
    prev: string;
}