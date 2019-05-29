import {Request, Response, Router} from "express";
import Database from "../database/Database";
import ConfigInterface from "../interfaces/ConfigInterface";

function contentRoutes(config: ConfigInterface, database: Database) {
  const router: Router = Router();

  // @todo: consider pagination
  router.get("/content", async (req: Request, res: Response) => {
    try {
      const entries = await database.getAll();
      res.status(200)
        .set("content-type", "application/json")
        .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
        .json(entries);

      config.logger.info("served all");
    } catch (error) {
      res.status(500).json({error: "Could not retrieve all entries", message: error.message});
      config.logger.error("could not retrieve all entries", {error: error.message});
    }
  });

  router.get("/content/:key", async (req: Request, res: Response) => {
    const {key} = req.params;

    try {
      const content: string = await database.get(key);

      if (content) {
        res.status(200)
          .set("content-type", "text/html")
          .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
          .end(content);

        config.logger.info("served", {key});
      } else {
        res.status(404).json({error: `Content with key "${key}" does not exist.`});
        config.logger.error("missed", {key});
      }
    } catch (error) {
      res.status(500).json({error: "could not serve content", message: error.message});
      config.logger.error("could not serve content", {key, error: error.message});
    }
  });

  router.delete("/content/:key", async (req: Request, res: Response) => {
    const {key} = req.params;

    try {
      await database.del(key);
      res.status(200).json({
        deleted: key,
      });
      config.logger.info("deleted", {key});
    } catch (error) {
      res.status(500).json({error: "could not delete content", message: error.message});
      config.logger.error("could not delete content", {key, error: error.message});
    }
  });

  router.get("/raw/*", async (req: Request, res: Response) => {
    const path = `/${req.params[0]}`;

    try {
      const content: string = await database.getByPath(path);

      if (content) {
        res.status(200)
          .set("content-type", "text/html")
          .set("cache-control", `max-age=${config.webserver.contentMaxAgeSec || 300}`)
          .end(content);

        config.logger.info("served raw", {path});
      } else {
        res.status(404).json({error: `Content with path "${path}" does not exist.`});
        config.logger.error("missed", {path});
      }
    } catch (error) {
      res.status(500).json({error: "could not serve content", message: error.message});
      config.logger.error("could not serve content", {path, error: error.message});
    }
  });

  return router;
}

export {contentRoutes};
