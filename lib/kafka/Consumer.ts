import EventEmitter from "events";

import {KafkaMessage, NConsumer as SinekConsumer, SortedMessageBatch} from "sinek";

import Database from "../database/Database";
import {isKafkaMessage, Message} from "../typeguards";
import ConfigInterface from "./../interfaces/ConfigInterface";

export default class Consumer extends EventEmitter {
  private readonly consumer: SinekConsumer;

  constructor(
    private config: ConfigInterface,
    private database: Database,
  ) {
    super();

    const {consumeFrom} = config;
    this.consumer = new SinekConsumer(consumeFrom, config);
    this.consume = this.consume.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Initially connect to Consumer
   */
  public async connect(): Promise<void> {
    try {
      await this.consumer.connect();
    } catch (error) {
      this.handleError(error);
    }

    // Consume as JSON with callback
    try {
      // Do not await this (it only fires after first message)
      this.consumer.consume(
        this.consume.bind(this),
        true,
        true,
        this.config.batchConfig,
      ).catch((error: Error) => this.handleError(error));
    } catch (error) {
      this.handleError(error);
    }

    this.consumer.on("error", this.handleError.bind(this));
  }

  /**
   * Closes the consumer
   */
  public close(): void {
    if (this.consumer) {
      this.consumer.close();
    }
  }

  private consume(message: Message, callback: (error: any) => void): void {
    if (Array.isArray(message)) {
      message.forEach((kafkaMessage: KafkaMessage) => this.consumeSingle(kafkaMessage, callback));
    } else if (isKafkaMessage(message)) {
      this.consumeSingle(message, callback);
    } else {
      this.consumeBatch(message, callback);
    }
  }

  /**
   * Handle consuming messages
   */
  private async consumeSingle(
    message: KafkaMessage,
    callback: (error: any) => void,
  ): Promise<void> {
    let error: Error | null;

    try {
      await this.handleMessage(message);
      error = null;
    } catch (producedError) {
      this.handleError(producedError);
      error = producedError;
    }

    // Return this callback to receive further messages
    callback(error);
  }

  private consumeBatch(batch: SortedMessageBatch, callback: (error: any) => void): void {
    for (const topic in batch) {
      if (!batch.hasOwnProperty(topic)) {
        continue;
      }

      for (const partition in batch[topic]) {
        if (!batch[topic].hasOwnProperty(partition)) {
          continue;
        }

        batch[topic][partition].forEach((message: KafkaMessage) => {
          this.consumeSingle(message, callback);
        });
      }
    }
  }

  /**
   * Handle newly created messages
   */
  private async handleMessage(message: KafkaMessage) {
    super.emit("info", "received message");

    const {content, path} = message.value;
    const key = message.key.toString("utf8");

    if (content) {
      try {
        await this.database.set(key, content, path);
        super.emit("stored", {key, path});
      } catch (error) {
        super.emit("error", {msg: "could not store page", key, path});
      }
    } else {
      try {
        await this.database.del(key);
        super.emit("deleted", {key, path});
      } catch (error) {
        super.emit("error", {msg: "could not delete page", key, path});
      }
    }
  }

  /**
   * If there is an error, please report it
   */
  private handleError(error: Error) {
    super.emit("error", error);
  }
}
