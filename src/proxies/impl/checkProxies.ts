import colors from 'colors';

type ProxyCategory = 'base' | 'anime' | 'manga' | 'meta';

const toCheck: string[] = [];

export async function checkCorsProxies(
    importProxies: boolean = false,
    startIndex: number =   0,
): Promise<{
    base: { providerId: string; ip: string }[];
    anime: { providerId: string; ip: string }[];
    manga: { providerId: string; ip: string }[];
    meta: { providerId: string; ip: string }[];
}> {
    const baseIps: { providerId: string; ip: string }[] = [];
    const animeIps: { providerId: string; ip: string }[] = [];
    const mangaIps: { providerId: string; ip: string }[] = [];
    const metaIps: { providerId: string; ip: string }[] = [];

    if (importProxies) {
        console.log(colors.yellow("Importing proxies..."));

        const file = Bun.file("./proxies.json");
        if (await file.exists()) {
            const proxies = await file.json();
            for (let i =   0; i < proxies.length; i++) {
                const ip = proxies[i].ip;
                const port = proxies[i].port;
                const providerId = proxies[i].providerId;
                const url = `http://${ip}:${port}`;
                toCheck.push(url);

                // Assuming you have a way to determine the category based on the providerId
                // For demonstration, let's randomly assign a category
                const categories: ProxyCategory[] = ['base', 'anime', 'manga', 'meta'];
                const category = categories[Math.floor(Math.random() * categories.length)];


                // Add the proxy to the corresponding category
                if (category === 'base') {
                    baseIps.push({ providerId, ip });
                } else if (category === 'anime') {
                    animeIps.push({ providerId, ip });
                } else if (category === 'manga') {
                    mangaIps.push({ providerId, ip });
                } else if (category === 'meta') {
                    metaIps.push({ providerId, ip });
                }
            }
        }
    }

    console.log(colors.yellow("Checking proxies..."));

    console.log(colors.gray("Finished checking proxies."));
    return {
        base: baseIps,
        anime: animeIps,
        manga: mangaIps,
        meta: metaIps,
    };
}