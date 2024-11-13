// proxyConfig.js
const path = require("path");
const { HttpsProxyAgent, HttpProxyAgent } = require("hpagent");

// Fake user agents array - you can expand this list
const FAKE_USER_AGENTS = [
 // chrome
 "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36",
 "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
 "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
 "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.53 Safari/537.36",
 // edge
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19582",
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19577",
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17720",
 "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.8810.3391 Safari/537.36 Edge/18.14383",
];

// Environment variables (you'll need to set these in your .env file)
const config = {
 SCRAPING_PROXY_HOST: process.env.SCRAPING_PROXY_HOST || "",
 SCRAPING_PROXY_USERNAME: process.env.SCRAPING_PROXY_USERNAME || "",
 SCRAPING_PROXY_PASSWORD: process.env.SCRAPING_PROXY_PASSWORD || "",
 SCRAPING_PROXY_PORT: process.env.SCRAPING_PROXY_PORT || "",
 BASE_DIR: process.env.BASE_DIR || path.join(__dirname, ""),
};

// Build proxy URL
function getProxyUrl() {
 if (!config.SCRAPING_PROXY_HOST) return "";

 return `http://${config.SCRAPING_PROXY_USERNAME}:${config.SCRAPING_PROXY_PASSWORD}@${config.SCRAPING_PROXY_HOST}:${config.SCRAPING_PROXY_PORT}`;
}

// Main function to get axios config for scraping
async function getScrapingConfig() {
 return {
  headers: {
   "User-Agent":
    FAKE_USER_AGENTS[Math.floor(Math.random() * FAKE_USER_AGENTS.length)],
  },
  agent: {
   http: new HttpProxyAgent({
    http: getProxyUrl(),
   }),
  },
 };
}

module.exports = {
 getScrapingConfig,
};
