import retry from "async-retry";
import {QueryTypes, Sequelize} from "sequelize";
import ConfigInterface from "../interfaces/ConfigInterface";

export default class Database {
  private readonly config: ConfigInterface;
  private readonly database: Sequelize;

  constructor(config: ConfigInterface) {
    this.config = config;

    const {database, username, password} = this.config.postgres;
    this.database = new Sequelize(database, username, password, {dialect: "postgres"});
  }

  public async connect(): Promise<void> {
    try {
      await retry(async (bail: any, attempt: number) => {
        this.config.logger.info(`trying to connect to database with attempt (${attempt}/10)`);
        await this.database.authenticate();
      }, {
        retries: 9,
        minTimeout: 3000,
        factor: 1,
        onRetry: (error: any) => {
          this.config.logger.error("Retrying to connect", {error: error.message});
        },
      });

      this.config.logger.info("Connection has been established successfully.");
    } catch (error) {
      this.config.logger.error("Unable to connect to the database: ", {error: error.message});

      // Since the database is a mandatory service, there is no need to do anything else here.
      // Restart the container and try again to connect.
      process.exit(1);
    }
  }

  public async set(id: string, content: string, path: string): Promise<void> {
    this.config.logger.info("[set] storing content", {id, path});

    const upsertQuery = `
      INSERT INTO
         "Contents"("id", "path", "content", "createdAt", "updatedAt")
      VALUES
        (:id, :path, :content, now(), now())
      ON CONFLICT (id)
      DO UPDATE SET
        "path" = EXCLUDED.path,
        "content" = EXCLUDED.content,
        "updatedAt" = now()
    `;

    await this.database.query(upsertQuery, {
      replacements: {
        id,
        path: this.getPathForQuery(path),
        content,
      },
    });

    this.config.logger.info("[set] content stored", {id, path});
  }

  public async get(id: string): Promise<any> {
    this.config.logger.info("[get] retrieving content", {id});

    const rows: Array<{content: string}> = await this.database.query(
      `SELECT "content" FROM "Contents" WHERE "id" = :id LIMIT 1`,
      {type: QueryTypes.SELECT, replacements: {id}},
    );

    if (rows && rows.length === 1) {
      this.config.logger.info("[get] content retrieved with id", {id});
      return rows[0].content;
    }

    this.config.logger.info("[get] no content found for id", {id});
    return "";
  }

  public async getByPath(path: string): Promise<string> {
    this.config.logger.info("[getByPath] retrieving raw content", {path});

    const rows: Array<{content: string}> = await this.database.query(
      `SELECT "content" FROM "Contents" WHERE "path" = :path ORDER BY "createdAt" DESC LIMIT 1`,
      {type: QueryTypes.SELECT, replacements: {path: `/${this.getPathForQuery(path)}`}},
    );

    if (rows && rows.length === 1) {
      return rows[0].content;
    }

    this.config.logger.info("[getByPath] no content found for path", {path});
    return "";
  }

  public async del(id: string): Promise<void> {
    this.config.logger.info("[del] deleting content", {id});

    await this.database.query(
      `DELETE FROM "Contents" WHERE "id" = :id`,
      {type: QueryTypes.DELETE, replacements: {id}},
    );

    this.config.logger.info("[del] content deleted", {id});
  }

  public async getAll(): Promise<any[]> {
    this.config.logger.info("[getAll] retrieving summary");

    return await this.database.query(`SELECT "id", "path" FROM "Contents"`, {type: QueryTypes.SELECT});
  }

  private getPathForQuery(path: string): string {
    let queryPath = path.startsWith("/") ? path.substr(1) : path;
    queryPath = queryPath.endsWith("/") ? path.substring(0, path.length - 1) : path;

    return queryPath;
  }
}
