import {EventEmitter} from "events";
import {Express, Router} from "express";
import Database from "./database/Database";
import Consumer from "./kafka/Consumer";

export default class Application extends EventEmitter {
  constructor(
    private readonly database: Database,
    private readonly consumer: Consumer,
    private readonly expressApplication: Express,
  ) {
    super();

    this.database.on("error", (data) => super.emit("error", data));
    this.database.on("info", (data) => super.emit("info", data));

    this.consumer.on("error", (data) => super.emit("error", data));
    this.consumer.on("stored", (data) => super.emit("stored", data));
    this.consumer.on("deleted", (data) => super.emit("deleted", data));

    this.expressApplication.on("missed", (data) => super.emit("missed", data));
  }

  public use(router: Router) {
    this.expressApplication.use(router);
  }

  public getDatabase() {
    return this.database;
  }

  public async start(port: number): Promise<void> {
    if (this.database) {
      await this.database.connect();
    }

    if (this.consumer) {
      // There is no necessity to await the consumer, since the application could already serve requests
      this.consumer.connect();
    }

    this.expressApplication.listen(port, (error: any) => {
      super.emit("error", {msg: "webserver crashed", error: error.message});
      process.exit(1);
    });
  }
}
