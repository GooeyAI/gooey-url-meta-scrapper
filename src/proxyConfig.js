// proxyConfig.js
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const https = require("https");

// Fake user agents array - you can expand this list
const FAKE_USER_AGENTS = [
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
 "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

// Environment variables (you'll need to set these in your .env file)
const config = {
 SCRAPING_PROXY_HOST: process.env.SCRAPING_PROXY_HOST || "",
 SCRAPING_PROXY_USERNAME: process.env.SCRAPING_PROXY_USERNAME || "",
 SCRAPING_PROXY_PASSWORD: process.env.SCRAPING_PROXY_PASSWORD || "",
 SCRAPING_PROXY_CERT_URL: process.env.SCRAPING_PROXY_CERT_URL || "",
 BASE_DIR: process.env.BASE_DIR || path.join(__dirname, ""),
};

// Build proxy URL
function getProxyUrl(scheme) {
 if (!config.SCRAPING_PROXY_HOST) return "";

 return `http://${config.SCRAPING_PROXY_USERNAME}:${config.SCRAPING_PROXY_PASSWORD}@${config.SCRAPING_PROXY_HOST}`;
}

// Get proxy configuration
const SCRAPING_PROXIES = config.SCRAPING_PROXY_HOST
 ? {
    http: getProxyUrl("http"),
    https: getProxyUrl("https"),
   }
 : {};

// Function to get proxy certificate
async function getScrapingProxyCertPath() {
 if (!config.SCRAPING_PROXY_CERT_URL) {
  return null;
 }

 const certPath = path.join(config.BASE_DIR, "proxy_ca_crt.pem");

 if (!fs.existsSync(certPath)) {
  console.log(`Downloading proxy cert to ${certPath}`);
  const response = await axios.get(config.SCRAPING_PROXY_CERT_URL, {
   responseType: "arraybuffer",
  });
  fs.writeFileSync(certPath, response.data);
 }

 return certPath;
}

// Main function to get axios config for scraping
async function getScrapingConfig() {
 const certPath = await getScrapingProxyCertPath();

 const httpsAgent = new https.Agent({
  ca: certPath ? fs.readFileSync(certPath) : undefined,
 });

 return {
  headers: {
   "User-Agent":
    FAKE_USER_AGENTS[Math.floor(Math.random() * FAKE_USER_AGENTS.length)],
  },
  proxy: SCRAPING_PROXIES,
  httpsAgent,
 };
}

module.exports = {
 getScrapingConfig,
 FAKE_USER_AGENTS,
 SCRAPING_PROXIES,
};
