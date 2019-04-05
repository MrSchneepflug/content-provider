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

    super.emit("info", "received message");

    const {content, path} = message.value;
    const key = message.key.toString("utf8");

    try {
      if (content) {
        await this.database.set(key, content, path);
      } else {
        await this.database.del(key);
      }

      commit();
      super.emit(content ? "stored" : "deleted", {key, path});
    } catch (error) {
      super.emit(
        "error",
        {
          msg: `could not ${content ? "store" : "delete"} page`,
          key,
          path,
          errorMessage: error.message,
        },
      );
    }
  }
}
