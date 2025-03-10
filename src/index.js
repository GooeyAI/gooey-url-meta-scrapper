const metascraper = require("metascraper")([
 require("metascraper-title")(),
 require("metascraper-description")(),
 require("metascraper-image")(),
 require("metascraper-logo-favicon")(),
]);
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { getScrapingConfig } = require("./proxyConfig");
const twitter = require("twitter-text");

const app = express();
const port = process.env.PORT || 8090;
const REQUEST_TIMEOUT_MS =
 parseInt(process.env.REQUEST_TIMEOUT_SEC || "40") * 1000;
const MAX_HTML_SIZE = 1000000;

app.use(cors());

app.listen(port, () => {
 console.log(`✅ Server started on port ${port}`);
});

app.get("/fetchUrlMeta", async (req, res) => {
 try {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing 'url' parameter" });

  const response = await dispatch({ data: [url], cmd: "fetchMetadata" });
  res.json(response);
 } catch (error) {
  console.error("Error processing request:", error);
  res.status(500).json({ error: "Failed to fetch metadata" });
 }
});

async function dispatch({ cmd, data }) {
 switch (cmd) {
  case "extractUrls":
   return twitter.extractUrls(data);
  case "fetchMetadata":
   for (const url of data) {
    return await fetchMetadata(url);
   }
   break;
 }
 return {};
}

async function fetchMetadata(targetUrl) {
 const proxyConfig = await getScrapingConfig();

 const response = await axios({
  method: "get",
  url: targetUrl,
  timeout: REQUEST_TIMEOUT_MS,
  responseType: "stream",
  headers: { Range: "bytes=0-65535" },
  ...proxyConfig,
 });

 const contentType = response.headers["content-type"] || "";
 let html = "";
 let hasEnded = false;

 return new Promise((resolve, reject) => {
  response.data.on("data", (chunk) => {
   if (hasEnded) return;
   html += chunk.toString();
   if (html.length >= MAX_HTML_SIZE) {
    hasEnded = true;
    response.data.destroy();
    processMetadata(html, targetUrl, contentType, resolve, startTime);
   }
  });

  response.data.on("end", () => {
   if (!hasEnded) {
    processMetadata(html, targetUrl, contentType, resolve, startTime);
   }
  });

  response.data.on("error", reject);
 });
}

async function processMetadata(
 html,
 targetUrl,
 contentType,
 resolve,
 startTime
) {
 const urlObj = new URL(targetUrl);
 const hostnameParts = urlObj.hostname.split(".");
 let mainDomain = hostnameParts.slice(-2, -1)[0] || urlObj.hostname;
 let ext = hostnameParts.slice(-1)[0] || "";

 const faviconUrl = new URL("https://www.google.com/s2/favicons");
 faviconUrl.searchParams.set("sz", "128");
 faviconUrl.searchParams.set("domain", `${mainDomain}.${ext}`);

 const preMeta = {
  url: targetUrl,
  logo: faviconUrl.toString(),
  content_type: contentType,
 };

 if (!contentType.includes("text/html")) return resolve(preMeta);

 const metaData = await metascraper({ html, url: targetUrl });
 console.log(`✅ Fetched metadata for ${targetUrl}`);

 resolve({ ...preMeta, ...metaData });
}
