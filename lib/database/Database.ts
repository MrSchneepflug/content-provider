import { EventEmitter } from "events";
import * as Sequelize from "sequelize";

import ConfigInterface from "../interfaces/ConfigInterface";
import SequelizeDatabase from "./SequelizeDatabase";

export default class Database extends EventEmitter {
  private config: ConfigInterface;
  private fromMemory: boolean;
  private memStorage: object;
  private database?: SequelizeDatabase;
  private model?: Sequelize.Model<any, any>;

  constructor(config: ConfigInterface) {
    super();

    this.config = config;
    this.memStorage = {};

    if (this.config.postgres.fromMemory) {
      this.fromMemory = true;
    } else {
      this.fromMemory = false;
      this.setupDatabase();
    }
  }

  public async connect(): Promise<void> {
    if (this.database) {
      try {
        await this.database.setup();

        this.model = await this.database.getModel("Content");
      } catch (err) {
        super.emit("error", `Error getting models: ${err.message}`);
      }
    }
  }

  public async set(key: string, content: string): Promise<void> {
    if (this.fromMemory) {
      this.memStorage[key] = content;
      return;
    }

    if (this.model) {
      this.model.upsert({
        content,
        id: key,
      });
    }

    return;
  }

  public async get(key: string): Promise<any> {

    if (this.fromMemory) {
      return this.memStorage[key];
    }

    if (this.model) {
      const content = await this.model.findOne({
        where: {
          id: key,
        },
      });

      if (content) {
        return content.dataValues.content;
      }
    }

    return "";
  }

  public async del(key: string): Promise<void> {
    if (this.fromMemory) {
      delete this.memStorage[key];
    }

    if (this.model) {
      await this.model.destroy({
        where: {
          id: key,
        },
      });
    }
  }

  public async close(): Promise<void> {
    if (this.database) {
      await this.database.close();
    }
  }

  private setupDatabase() {
    this.database = new SequelizeDatabase(this.config.postgres);

    this.database.on("info", super.emit.bind(this, "info"));
    this.database.on("error", super.emit.bind(this, "error"));
  }
}
