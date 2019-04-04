import {Express, Request, Response, Router} from "express";
import Database from "../database/Database";
import ConfigInterface from "../interfaces/ConfigInterface";
import ContentInterface from "../interfaces/ContentInterface";

function contentRoutes(app: Express, config: ConfigInterface, database: Database) {
  const router: Router = Router();

  // @todo: consider pagination
  router.get("/content", async (req: Request, res: Response) => {
    try {
      const entries = await database.getAll();

      app.emit("served all");
      res.status(200)
        .set("content-type", "application/json")
        .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
        .json(entries);

      return;
    } catch (error) {
      app.emit("error", "could not retrieve all entries");
    }

    res.status(500).json({error: "Could not retrieve all entries"});
  });

  router.get("/content/:key", async (req: Request, res: Response) => {
    const {key} = req.params;

    try {
      const content: string = await database.get(key);

      if (content) {
        app.emit("served", {key});
        res.status(200)
          .set("content-type", "text/html")
          .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
          .end(content);
      } else {
        app.emit("missed", {key});
        res.status(404).json({error: `Content with key "${key}" does not exist.`});
      }
    } catch (error) {
      app.emit("missed", {key});
    }
  });

  router.get("/raw/*", async (req: Request, res: Response) => {
    const path = req.params[0];

    try {
      const entry: ContentInterface | null = await database.getByPath(path);

      if (entry && entry.content) {
        app.emit("served raw", {path});
        res.status(200)
          .set("content-type", "text/html")
          .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
          .end(entry.content);
      } else {
        app.emit("missed", {path});
        res.status(404).json({error: `Content with path "${path}" does not exist.`});
      }
    } catch (error) {
      app.emit("missed", {path});
    }

    res.status(404).json({error: `Content with path "${path}" not found`});
  });

  return router;
}

export {contentRoutes};
