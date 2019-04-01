import {EventEmitter} from "events";
import {Express} from "express";
import Database from "./database/Database";
import Consumer from "./kafka/Consumer";

export default class Application extends EventEmitter {
  constructor(
    private readonly database: Database,
    private readonly consumer: Consumer,
    private readonly expressApplication: Express,
  ) {
    super();
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
      if (error) {
        super.emit("error", {msg: "webserver crashed", error: error.message});
        process.exit(1);
      } else {
        super.emit("info", `Application listening on port ${port}`);
      }
    });
  }
}
