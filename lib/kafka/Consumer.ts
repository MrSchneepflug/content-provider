import EventEmitter from "events";

import {NConsumer as SinekConsumer} from "sinek";

import Database from "../database/Database";
import ConfigInterface from "./../interfaces/ConfigInterface";
import ConsumerPayloadInterface from "./../interfaces/ConsumerPayloadInterface";

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
        this.config.consumerOptions,
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

  /**
   * Handle consuming messages
   */
  private async consume(
    message: object,
    callback: (error: Error | null) => void,
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

  /**
   * Handle newly created messages
   */
  private async handleMessage(message: any) {
    const messageContent: ConsumerPayloadInterface = {
      content: message.value.content,
      key: message.key.toString("utf8"),
      path: message.value.path,
    };

    const {key, path} = messageContent;

    if (message.content) {
      try {
        await this.database.set(message.key, message.content, message.path);
        super.emit("stored", {key, path});
      } catch (error) {
        super.emit("error", {msg: "could not store page", key, path});
      }
    } else {
      try {
        await this.database.del(message.key);
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
