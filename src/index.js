const metascraper = require("metascraper")([
 require("metascraper-title")(),
 require("metascraper-description")(),
 require("metascraper-image")(),
 require("metascraper-logo-favicon")(),
]);
require("dotenv").config?.();

const express = require("express");
var cors = require("cors");
const { getScrapingConfig } = require("./proxyConfig");

const app = express();
const port = process.env.PORT || 8090;
const axios = require("axios");

require("dotenv").config();
const MAX_HTML_SIZE = 1000000;
const REQUEST_TIMEOUT_MS =
 parseInt(process.env.REQUEST_TIMEOUT_SEC || 40) * 1000;

app.listen(port, () => {
 console.log(`Server started on port ${port}`);
});

app.use(cors());

app.get("/fetchUrlMeta", (req, res) => {
 const { url } = req.query;
 return fetchMetadata(url)
  .then((meta) => {
   res.json(meta);
  })
  .catch((error) => {
   console.error(error);
   res.status(500).json({ error: error.message });
  });
});

async function fetchMetadata(targetUrl) {
 const proxyConfig = getScrapingConfig();

 const response = await axios.get(targetUrl, {
  timeout: REQUEST_TIMEOUT_MS,
  maxBodyLength: MAX_HTML_SIZE,
  ...proxyConfig, // Add proxy configuration here
 });

 const contentType = response.headers["content-type"] || "";
 const urlObj = new URL(targetUrl);

 const faviconUrl = new URL("https://www.google.com/s2/favicons");
 faviconUrl.searchParams.set("sz", "128");
 faviconUrl.searchParams.set("domain", urlObj?.hostname);

 const preMeta = {
  url: targetUrl,
  logo: faviconUrl.toString(),
  content_type: contentType,
 };

 if (!contentType.includes("text/html")) return preMeta;

 const metaData = await metascraper({ html: response.data, url: targetUrl });
 console.log(`✅  Fetched metadata for ${targetUrl}`);

 return { ...preMeta, ...metaData };
}
