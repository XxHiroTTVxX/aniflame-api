import colors from "colors";

/**
 * @description Main request helper class. Manages CORS proxies and Google Translate proxy.
 */
export default class Http {

    /**
     * @description Main request function. Sends a request to the URL with the specified config.
     * @param providerId Provider ID
     * @param useGoogleTranslate Whether to use Google Translate proxy or not.
     * @param url URL to send a request to
     * @param config Native fetch() config
     * @param proxyRequest Whether to proxy the request or not.
     * @param requests Number of requests sent (for retry purposes)
     * @param customProxy Whether to use a specific proxy or not. Mainly for checking CORS proxies.
     * @returns Promise<Response>
     */
    static async request(providerId: string, useGoogleTranslate: boolean, url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {
        return new Promise(async (resolve) => {
            try {
                // If proxyRequest is true, use a proxy.
                if (proxyRequest) {
                    // Get the proxy URL.
                    const proxyUrl = useGoogleTranslate ? "http://translate.google.com/translate?sl=ja&tl=en&u=" : customProxy
                    if (!proxyUrl) {
                        return resolve({
                            ok: false,
                            status: 500,
                            statusText: "No proxy available.",
                            text: () => Promise.resolve(""),
                            json: () => Promise.resolve({ error: "No proxy available." }),
                        } as Response);
                    }

                    // Modify the URL to use the proxy.
                    const modifyUrl = useGoogleTranslate ? `${proxyUrl}${encodeURIComponent(url)}` : `${proxyUrl}/${url}`;

                    // Create an AbortController to abort the request after 10 seconds.
                    const controller = new AbortController();
                    const id = setTimeout(() => {
                        controller.abort();
                    }, 10000);

                    controller.signal.addEventListener("abort", () => {
                        return resolve({
                            ok: false,
                            status: 500,
                            statusText: "Timeout",
                            text: () => Promise.resolve(""),
                            json: () => Promise.resolve({ error: "Timeout" }),
                        } as Response);
                    });

                    try {
                        // CORS proxies require the Origin header to be set to the website's URL.
                        config = {
                            ...config,
                            headers: {
                                ...config.headers,
                                Origin: "https://anify.tv",
                            },
                        };

                        // Send the request
                        const response = await fetch(modifyUrl, {
                            signal: controller.signal,
                            ...config,
                        }).catch(
                            (err) =>
                                ({
                                    ok: false,
                                    status: 500,
                                    statusText: "Timeout",
                                    json: () => Promise.resolve({ error: err }),
                                }) as Response,
                        );

                        // Retry up to a max of 3 times.
                        if (response.statusText === "Timeout") {
                            if (requests >= 3) {
                                console.log(colors.red("Request timed out. Retried 3 times. Aborting..."));
                                return response;
                            }

                            return this.request(providerId, useGoogleTranslate, url, config, proxyRequest, requests + 1);
                        }

                        clearTimeout(id);
                        return resolve(response);
                    } catch (error) {
                        console.log(proxyUrl);
                        clearTimeout(id);
                        throw error;
                    }
                } else {
                    return resolve(fetch(url, config));
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        });
    }
}