import EventEmitter from "events";
import {NConsumer as SinekConsumer} from "sinek";
import Database from "../database/Database";
import {isKafkaMessage, SinekMessage} from "../typeguards";
import ConfigInterface from "./../interfaces/ConfigInterface";

export default class Consumer extends EventEmitter {
  private readonly consumer: SinekConsumer;

  constructor(private config: ConfigInterface, private database: Database) {
    super();

    const {consumeFrom} = config;
    this.consumer = new SinekConsumer(consumeFrom, config);
    this.consumer.on("error", (error) => super.emit("error", error));
  }

  public async connect(): Promise<void> {
    try {
      await this.consumer.connect();
    } catch (error) {
      super.emit("error", error);
    }

    this.consumer
      .consume(this.consume.bind(this), true, true)
      .catch((error: Error) => super.emit("error", error));
  }

  private async consume(message: SinekMessage, commit: () => void): Promise<void> {
    if (!isKafkaMessage(message)) {
      throw new Error("Can only handle messages in KafkaMessage format");
    }

    try {
      super.emit("info", "received message");

      const {content, path} = message.value;
      const key = message.key.toString("utf8");

      if (content) {
        try {
          await this.database.set(key, content, path);
          commit();
          super.emit("stored", {key, path});
        } catch (error) {
          super.emit("error", {msg: "could not store page", key, path});
        }
      } else {
        try {
          await this.database.del(key);
          commit();
          super.emit("deleted", {key, path});
        } catch (error) {
          super.emit("error", {msg: "could not delete page", key, path});
        }
      }
    } catch (error) {
      super.emit("error", error);
    }
  }
}
