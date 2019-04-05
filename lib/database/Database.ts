import {Model} from "sequelize";

import ConfigInterface from "../interfaces/ConfigInterface";
import ContentInterface from "../interfaces/ContentInterface";
import SequelizeDatabase from "./SequelizeDatabase";

export default class Database {
  private readonly config: ConfigInterface;
  private readonly fromMemory: boolean;
  private readonly memStorage: {
    [key: string]: string;
  };
  private readonly database?: SequelizeDatabase;
  private model?: Model<any, any>;

  constructor(config: ConfigInterface) {
    this.config = config;
    this.memStorage = {};

    this.fromMemory = this.config.postgres.fromMemory || !this.config.postgres.username;

    if (!this.fromMemory) {
      this.database = new SequelizeDatabase(this.config.postgres, this.config.logger);
    }
  }

  public async connect(): Promise<void> {
    if (this.database) {
      try {
        await this.database.setup();

        this.model = await this.database.getModel("Content");
      } catch (error) {
        this.config.logger.error("Error getting models", {error: error.message});
      }
    }
  }

  public async set(key: string, content: string, path: string): Promise<void> {
    this.config.logger.info("[set] storing content", {key, path});

    if (this.fromMemory) {
      this.config.logger.info("[set] using memory for content", {key, path});
      this.memStorage[key] = content;
      return;
    }

    if (this.model) {
      // @ts-ignore
      await this.model.upsert({
        content,
        id: key,
        path: this.getPathForQuery(path),
      });

      this.config.logger.info("[set] content stored", {key, path});
    } else {
      this.config.logger.error("[set] No model available, cannot store", {key, path});
    }
  }

  public async get(key: string): Promise<any> {
    this.config.logger.info("[get] retrieving content", {key});

    if (this.fromMemory) {
      this.config.logger.info("[get] using memory for content", {key});
      return this.memStorage[key];
    }

    if (this.model) {
      // @ts-ignore
      const content = await this.model.findOne({
        where: {
          id: key,
        },
      });

      if (content) {
        this.config.logger.info("[get] content retrieved with key", {key});
        return content.dataValues.content;
      }
    } else {
      this.config.logger.error("[get] No model available, cannot get", {key});
    }

    return "";
  }

  public async getByPath(path: string): Promise<ContentInterface | null> {
    this.config.logger.info("[getByPath] retrieving raw content", {path});

    if (this.model) {
      // @ts-ignore
      const content = await this.model.findOne({
        order: [["createdAt", "DESC"]],
        where: {
          path: `/${this.getPathForQuery(path)}`,
        },
      });

      if (content) {
        return content.dataValues;
      }
    } else {
      this.config.logger.error("[getByPath] No model available, cannot getByPath", {path});
    }

    return null;
  }

  public async del(key: string): Promise<void> {
    this.config.logger.info("[del] deleting content", {key});

    if (this.fromMemory) {
      this.config.logger.info("[del] using memory for content", {key});
      delete this.memStorage[key];
    }

    if (this.model) {
      await this.model.destroy({
        // @ts-ignore
        where: {
          id: key,
        },
      });

      this.config.logger.info("[del] content deleted", {key});
    }
  }

  public async getAll(): Promise<any[]> {
    this.config.logger.info("[getAll] retrieving summary");

    if (this.fromMemory) {
      this.config.logger.info("[getAll] using memory");

      const entries = [];

      for (const key in this.memStorage) {
        if (!this.memStorage.hasOwnProperty(key)) {
          continue;
        }

        entries.push({id: key, content: this.memStorage[key]});
      }

      return entries;
    }

    if (this.model) {
      // @ts-ignore
      return await this.model.findAll({
        attributes: ["id", "path"],
      });
    }

    return [];
  }

  private getPathForQuery(path: string): string {
    let queryPath = path.startsWith("/") ? path.substr(1) : path;
    queryPath = queryPath.endsWith("/") ? path.substring(0, path.length - 1) : path;

    return queryPath;
  }
}
