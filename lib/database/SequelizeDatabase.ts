import retry from "async-retry";
import { EventEmitter } from "events";
import {Model, Sequelize} from "sequelize";

import DatabaseConfigInterface from "../interfaces/DatabaseConfigInterface";
import Models from "../models";

export default class SequelizeDatabase extends EventEmitter {
  private db: Sequelize;

  constructor(private options: DatabaseConfigInterface) {
    super();

    const config = Object.assign({
      database: "",
      password: "",
      username: "",
    }, options);

    this.db = new Sequelize(
      config.database,
      config.username,
      config.password,
      config,
    );
  }

  public async setup(): Promise<void> {
    try {
      await this.testConnection();
      await this.sync();
    } catch (err) {
      super.emit("error", `Unable to set up connection: ${err.message}`);
    }
  }

  public async close(): Promise<void> {
    await this.db.close();
  }

  public getModel(name: string): Model<any, any> {
    // @ts-ignore
    return this.db[name];
  }

  private async testConnection(): Promise<void> {
    try {
      await retry(async (bail: any, attempt: number) => {
        super.emit("info", `trying to connect to database with attempt (${attempt}/10)`);
        await this.db.authenticate();
      }, {
        retries: 9,
        minTimeout: 3000,
        factor: 1,
        onRetry: (error: any) => {
          super.emit("error", `Retrying to connect, error: ${error.message}`);
        },
      });

      super.emit("info", "Connection has been established successfully.");
    } catch (err) {
      super.emit("error", `Unable to connect to the database: ${err.message}`);

      // Since the database is a mandatory service, there is no need to do anything else here.
      // Restart the container and try again to connect.
      process.exit(1);
    }
  }

  private async sync() {
    try {
      this.db = await new Models(this.db).load();
    } catch (err) {
      super.emit("error", `Unable to sync models: ${err.message}`);
    }
  }
}
