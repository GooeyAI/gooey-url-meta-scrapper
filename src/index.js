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

const got = require("got");
const twitter = require("twitter-text");

require("dotenv").config();

const REQUEST_TIMEOUT_MS =
 parseInt(process.env.REQUEST_TIMEOUT_SEC || 40) * 1000;

app.listen(port, () => {
 console.log(`Server started on port ${port}`);
});

app.use(cors());

app.get("/fetchUrlMeta", (req, res) => {
 const { url } = req.query;
 dispatch({ data: [url], cmd: "fetchMetadata" }).then((response) => {
  res.json(response);
 });
});

async function dispatch({ cmd, data }) {
 switch (cmd) {
  case "extractUrls":
   return twitter.extractUrls(data);
  case "fetchMetadata":
   let url;
   for (url of data) {
    try {
     let metadata = await fetchMetadata(url);
     metadata.url = url;
     return metadata;
    } catch (e) {
     console.log("!", url, e);
    }
   }
   break;
 }
 return {};
}

async function fetchMetadata(targetUrl) {
 const proxyConfig = await getScrapingConfig();

 const {
  body: html,
  url,
  headers,
  redirectUrls = [],
 } = await got(targetUrl, {
  timeout: {
   request: REQUEST_TIMEOUT_MS,
  },
  retry: {
   limit: 0,
  },
  ...proxyConfig, // Add proxy configuration here
 });

 const contentType = headers?.["content-type"];
 let hostname = new URL(
  redirectUrls.length ? [...redirectUrls].pop() : targetUrl
 ).hostname;
 const hostnameParts = hostname.split(".");

 if (hostnameParts.length >= 2) {
  const mainDomain = hostnameParts.slice(-2, -1)[0]; // gooey, google, facebook etc
  const ext = hostnameParts.slice(-1)[0]; // .ai, .com, .org, .net, etc
  if (hostname.includes("googleapis"))
   // for favicon logo from googleapis include subdomain
   hostname = hostnameParts.slice(-3, -1).join("."); // storage.googleapis.com etc
  hostname = mainDomain + "." + ext;
 }

 const preMeta = {
  redirect_urls: redirectUrls,
  url: targetUrl,
  logo: `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`,
  content_type: contentType,
 };

 if (!contentType.includes("text/html")) return preMeta;
 const metaData = await metascraper({ html, url });
 return {
  ...preMeta,
  ...metaData,
 };
}
