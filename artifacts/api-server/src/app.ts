import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import path from "node:path";
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

const repoRoot = process.cwd();
const incidentPublicDir = path.resolve(
  repoRoot,
  "artifacts/incident-simulator/dist/public",
);
const cosPublicDir = path.resolve(repoRoot, "artifacts/cos-simulator/dist/public");

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
