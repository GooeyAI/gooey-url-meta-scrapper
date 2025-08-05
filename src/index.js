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
function createFallbackMetadata(targetUrl, contentType) {
  const urlObj = new URL(targetUrl);
  const faviconUrl = new URL("https://www.google.com/s2/favicons");
  faviconUrl.searchParams.set("sz", "128");
  faviconUrl.searchParams.set("domain", urlObj.hostname);

  return {
    url: targetUrl,
    logo: faviconUrl.toString(),
    content_type: contentType,
    title: undefined,
    description: undefined,
    image: undefined,
    content_length: 0,
  };
}

async function readHtmlWithinLimit(stream, maxSize) {
  const chunks = [];
  let totalLength = 0;
  for await (const chunk of stream) {
    totalLength += chunk.length;
    if (totalLength < maxSize) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks).toString("utf-8");
}
async function fetchMetadata(targetUrl) {
  const proxyConfig = getScrapingConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { ...proxyConfig.headers },
      agent: proxyConfig.agent,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        ...createFallbackMetadata(targetUrl, contentType),
        error: response.statusText,
      };
    }

    if (!contentType.includes("text/html")) {
      return {
        ...createFallbackMetadata(targetUrl, contentType),
        error: "Not a HTML page",
      };
    }

    const html = await readHtmlWithinLimit(response.body, MAX_HTML_SIZE);

    const metaData = await metascraper({ html, url: targetUrl });

    if (metaData.image && isBlockedImageHost(metaData.image)) {
      delete metaData.image;
    }

    console.log(`✅  Fetched metadata for ${targetUrl}`);
    return {
      ...createFallbackMetadata(targetUrl, contentType),
      ...metaData,
      content_length: html.length,
    };
  } catch (error) {
    console.error("Metadata fetch failed:", error);
    return {
      ...createFallbackMetadata(targetUrl, contentType),
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
