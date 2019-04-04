import {Request, Response, Router} from "express";

function healthRoutes() {
  const router: Router = Router();

  router.get("/alive", (req: Request, res: Response): void => {
    res.status(200).end();
  });

  router.get("/admin/health", (req: Request, res: Response): void => {
    res.status(200).json({
      status: "UP",
    });
  });

  router.get("/admin/healthcheck", (req: Request, res: Response): void => {
    res.status(200).end();
  });

  return router;
}

export {healthRoutes};
