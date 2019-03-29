import {EventEmitter} from "events";

import cors from "cors";
import express from "express";

import ConfigInterface from "./interfaces/ConfigInterface";
import ConsumerPayloadInterface from "./interfaces/ConsumerPayloadInterface";

import {Response} from "express";
import Database from "./database/Database";
import ContentInterface from "./interfaces/ContentInterface";
import Consumer from "./kafka/Consumer";
import healthRoutes from "./routes/health";

export default class Application extends EventEmitter {
  private consumer?: Consumer;
  private database: Database;
  private server?: any;

  constructor(private config: ConfigInterface) {
    super();

    this.config = config;

    this.database = this.setupDatabase();
    this.server = null;

    if (this.config.kafkaHost) {
      this.consumer = new Consumer(config, this.handleMessage.bind(this));
      this.consumer.on("error", this.handleError.bind(this));
    }

    this.handleServed = this.handleServed.bind(this);
    this.handleMissed = this.handleMissed.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  public getDatabase() {
    return this.database;
  }

  public async start(): Promise<express.Application> {

    if (this.database) {
      await this.database.connect();
    }

    if (this.consumer) {
      // There is no necessity to await the consumer, since the application could already serve requests
      this.consumer.connect();
    }

    const app = express();

    app.use(cors());
    app.use(healthRoutes());

    app.get("/content/:key", async (req: express.Request, res: express.Response) => {
      const {key} = req.params;

      const content: string = await this.database.get(key);
      await this.render(res, key, content);
    });

    app.get("/raw/*", async (req: express.Request, res: express.Response) => {
      const path = req.params[0];

      try {
        const entry: ContentInterface | null = await this.database.getByPath(path);

        if (entry) {
          await this.render(res, path, entry.content);
          return;
        }
      } catch (error) {
        super.emit("missed", {
          key: path,
        });
      }

      res.status(404).json({
        error: `Content with path "${path}" not found`,
      });
    });

    this.server = await (new Promise((resolve, reject) => {
      let server: any;
      server = app.listen(this.config.webserver.port, (error: any) => {

        if (error) {
          return reject(error);
        }

        resolve(server);
      });
    }));

    return app;
  }

  private async render(res: Response, key: string, content: string): Promise<void> {
    if (content) {
      super.emit("served", {key});

      res.status(200);
      res.set("content-type", "text/html");
      res.set("cache-control", `max-age=${this.config.webserver.contentMaxAgeSec || 300}`);
      res.write(content);
      res.end();
    } else {
      super.emit("missed", {key});
      res.status(404).json({error: `Content with key or path "${key}" does not exist.`});
    }
  }

  private setupDatabase() {
    const database = new Database(this.config);

    database.on("error", this.handleError.bind(this));
    database.on("info", (data) => super.emit("info", data));

    return database;
  }

  /**
   * If there is an error, please report it
   */
  private handleError(error: Error): void {
    super.emit("error", error);
  }

  /**
   * If there is no content, please report it
   */
  private handleMissed(data: any): void {
    super.emit("missed", data);
  }

  /**
   * If content is served, please report it
   */
  private handleServed(data: any): void {
    super.emit("served", data);
  }

  /**
   * Handles an incoming Kafka message from the consumer
   * by applying a delete or set on the database (table)
   * @param message
   */
  private async handleMessage(message: ConsumerPayloadInterface) {
    const {key, path} = message;

    if (message.content) {
      try {
        await this.database.set(message.key, message.content, message.path);
        super.emit("stored", {key, path});
      } catch (error) {
        super.emit("error", {msg: "could not store page", key, path});
      }
    } else {
      try {
        await this.database.del(message.key);
        super.emit("deleted", {key, path});
      } catch (error) {
        super.emit("error", {msg: "could not delete page", key, path});
      }
    }
  }
}
