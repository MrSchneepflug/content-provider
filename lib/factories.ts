import cors from "cors";
import {Express} from "express";
import express from "express";
import Database from "./database/Database";
import ConfigInterface from "./interfaces/ConfigInterface";
import {contentRoutes, healthRoutes} from "./routes";

export function createExpressApplication(config: ConfigInterface, database: Database): Express {
  const app = express();

  app.use(cors());
  app.use(healthRoutes());
  app.use(contentRoutes(config, database));

  return app;
}
