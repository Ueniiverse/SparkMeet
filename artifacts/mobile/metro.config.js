const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/api/")) {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          const body = Buffer.concat(chunks);
          const options = {
            hostname: "localhost",
            port: 8080,
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              host: "localhost:8080",
              "content-length": body.length,
            },
          };
          const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          });
          proxyReq.on("error", (err) => {
            res.writeHead(502);
            res.end(JSON.stringify({ error: err.message }));
          });
          proxyReq.end(body);
        });
      } else {
        middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
