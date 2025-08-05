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

const BLOCKED_IMAGE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "lh3.googleusercontent.com",
]);

function isBlockedImageHost(imageUrl) {
  try {
    const { host } = new URL(imageUrl);
    return BLOCKED_IMAGE_HOSTS.has(host);
  } catch (err) {
    console.error(`Invalid image URL: ${imageUrl}`, err);
    return true;
  }
}

async function fetchMetadata(targetUrl) {
  const proxyConfig = getScrapingConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        ...proxyConfig.headers,
      },
      agent: proxyConfig.agent,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
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

  // Enforce maxContentLength by reading the response as a stream
  let chunks = [];
  let totalLength = 0;
  for await (const chunk of response.body) {
    totalLength += chunk.length;
    if (totalLength < MAX_HTML_SIZE) chunks.push(chunk);
  }
  const html = Buffer.concat(chunks).toString("utf-8");

  const metaData = await metascraper({ html, url: targetUrl });

  // ignore images hosted on drive.google.com
  if (metaData.image) {
    try {
      const imageUrl = new URL(metaData.image);
      if (isBlockedImageHost(imageUrl.host)) {
        delete metaData.image;
      }
    } catch (error) {
      console.error(`Invalid image URL: ${metaData.image}`, error);
    }
  }
  console.log(`✅  Fetched metadata for ${targetUrl}`);

  return { ...preMeta, ...metaData, content_length: totalLength };
}
