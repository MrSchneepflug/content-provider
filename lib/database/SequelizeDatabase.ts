import retry from "async-retry";
import {Model, Sequelize} from "sequelize";

import DatabaseConfigInterface from "../interfaces/DatabaseConfigInterface";
import LoggerInterface from "../interfaces/LoggerInterface";
import Models from "../models";

export default class SequelizeDatabase {
  private db: Sequelize;

  constructor(private options: DatabaseConfigInterface, private readonly logger: LoggerInterface) {
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
    } catch (error) {
      this.logger.error("Unable to set up connection", {error: error.message});
    }
  }

  public getModel(name: string): Model<any, any> {
    // @ts-ignore
    return this.db[name];
  }

  private async testConnection(): Promise<void> {
    try {
      await retry(async (bail: any, attempt: number) => {
        this.logger.info(`trying to connect to database with attempt (${attempt}/10)`);
        await this.db.authenticate();
      }, {
        retries: 9,
        minTimeout: 3000,
        factor: 1,
        onRetry: (error: any) => {
          this.logger.error("Retrying to connect", {error: error.message});
        },
      });

      this.logger.info("Connection has been established successfully.");
    } catch (error) {
      this.logger.error("Unable to connect to the database: ", {error: error.message});

      // Since the database is a mandatory service, there is no need to do anything else here.
      // Restart the container and try again to connect.
      process.exit(1);
    }
  }

  private async sync() {
    try {
      this.db = await new Models(this.db).load();
    } catch (error) {
      this.logger.error("Unable to sync models", {error: error.message});
    }
  }
}
