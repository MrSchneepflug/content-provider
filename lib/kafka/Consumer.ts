import {NConsumer as SinekConsumer} from "sinek";
import Database from "../database/Database";
import {isKafkaMessage, SinekMessage} from "../typeguards";
import ConfigInterface from "./../interfaces/ConfigInterface";

export default class Consumer {
  private readonly consumer: SinekConsumer;

  constructor(private config: ConfigInterface, private database: Database) {
    const {consumeFrom} = config;
    this.consumer = new SinekConsumer(consumeFrom, config);
    this.consumer.on("error", (error) => this.config.logger.error(`[SinekError]: ${error.message}`, error));
  }

  public async connect(): Promise<void> {
    try {
      await this.consumer.connect();
    } catch (error) {
      this.config.logger.error("Could not connect consumer", {error: error.message});
    }

    this.consumer
      .consume(this.consume.bind(this), true, true)
      .catch((error: Error) => this.config.logger.error("Could not connect consumer", {error: error.message}));
  }

  private async consume(message: SinekMessage, commit: () => void): Promise<void> {
    if (!isKafkaMessage(message)) {
      throw new Error("Can only handle messages in KafkaMessage format");
    }

    const {content, path} = message.value;
    const key = message.key.toString("utf8");

    this.config.logger.info("receiving message", {key, path});

    try {
      if (content) {
        await this.database.set(key, content, path);
      } else {
        await this.database.del(key);
      }

      commit();
      this.config.logger.info(content ? "stored" : "deleted", {key, path});
    } catch (error) {
      this.config.logger.error(`could not ${content ? "store" : "delete"} page`, {
        key,
        path,
        errorMessage: error.message,
      });
    }
  }
}
