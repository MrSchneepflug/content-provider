import {Express, Request, Response, Router} from "express";
import Database from "../database/Database";
import ConfigInterface from "../interfaces/ConfigInterface";
import ContentInterface from "../interfaces/ContentInterface";

async function render(
  res: Response,
  key: string,
  content: string,
  app: Express,
  config: ConfigInterface,
): Promise<void> {
  if (content) {
    app.emit("served", {key});

    res.status(200)
      .set("content-type", "text/html")
      .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`);

    res.end(content);
  } else {
    app.emit("missed", {key});
    res.status(404).json({error: `Content with key or path "${key}" does not exist.`});
  }
}

function contentRoutes(app: Express, config: ConfigInterface, database: Database) {
  const router: Router = Router();

  router.get("/content/:key", async (req: Request, res: Response) => {
    const {key} = req.params;

    const content: string = await database.get(key);
    await render(res, key, content, app, config);
  });

  router.get("/raw/*", async (req: Request, res: Response) => {
    const path = req.params[0];

    try {
      const entry: ContentInterface | null = await database.getByPath(path);

      if (entry) {
        await render(res, path, entry.content, app, config);
        return;
      }
    } catch (error) {
      app.emit("missed", {key: path});
    }

    res.status(404).json({error: `Content with path "${path}" not found`});
  });

  return router;
}

export {contentRoutes};
