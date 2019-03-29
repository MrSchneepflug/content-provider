import cors from "cors";
import {Express, Request, Response} from "express";
import express from "express";
import Database from "./database/Database";
import ConfigInterface from "./interfaces/ConfigInterface";
import ContentInterface from "./interfaces/ContentInterface";
import healthRoutes from "./routes/health";

export function createExpressApplication(config: ConfigInterface, database: Database): Express {
  const app = express();

  app.use(cors());
  app.use(healthRoutes());

  app.get("/content/:key", async (req: Request, res: Response) => {
    const {key} = req.params;

    const content: string = await database.get(key);
    await render(res, key, content);
  });

  app.get("/raw/*", async (req: Request, res: Response) => {
    const path = req.params[0];

    try {
      const entry: ContentInterface | null = await database.getByPath(path);

      if (entry) {
        await render(res, path, entry.content);
        return;
      }
    } catch (error) {
      app.emit("missed", {key: path});
    }

    res.status(404).json({error: `Content with path "${path}" not found`});
  });

  async function render(res: Response, key: string, content: string): Promise<void> {
    if (content) {
      app.emit("served", {key});

      res.status(200)
        .set("content-type", "text/html")
        .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
        .write(content);
    } else {
      app.emit("missed", {key});

      res.status(404)
        .json({error: `Content with key or path "${key}" does not exist.`});
    }
  }

  return app;
}
