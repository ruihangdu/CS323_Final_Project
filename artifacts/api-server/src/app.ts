import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Anchor to this file's location so paths work regardless of what cwd pnpm sets.
// In production: __dirname = artifacts/api-server/dist/
//   → ../../../  = repo root
// In development (ts-node / tsx): __dirname = artifacts/api-server/src/
//   → ../../../../ would be needed, but dev doesn't serve static files anyway.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const incidentPublicDir = path.resolve(
  repoRoot,
  "artifacts/incident-simulator/dist/public",
);
const cosPublicDir = path.resolve(repoRoot, "artifacts/cos-simulator/dist/public");

logger.info({ repoRoot, incidentPublicDir, cosPublicDir }, "Static file paths");

if (existsSync(incidentPublicDir)) {
  if (existsSync(cosPublicDir)) {
    app.use("/cos-simulator", express.static(cosPublicDir));
    app.get(/^\/cos-simulator(?:\/.*)?$/, (_req, res) => {
      res.sendFile(path.join(cosPublicDir, "index.html"));
    });
  }

  app.use(express.static(incidentPublicDir));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(incidentPublicDir, "index.html"));
  });
}

export default app;
