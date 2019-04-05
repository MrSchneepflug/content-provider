import {Express} from "express";
import {merge} from "lodash";
import Database from "./lib/database/Database";
import {createExpressApplication} from "./lib/factories";
import ConfigInterface from "./lib/interfaces/ConfigInterface";
import Consumer from "./lib/kafka/Consumer";

const defaultOptions: ConfigInterface = {
  kafkaHost: "127.0.0.1:9092",
  // metadata.broker.list MUST be set via kafkaHost-property. If we set it here manually, it will be used as
  // an overwrite.
  //
  // @ts-ignore
  noptions: {
    "group.id": "content-provider",
    "api.version.request": true,
    "socket.keepalive.enable": true,
    "enable.auto.commit": false,
  },
  tconf: {
    "auto.offset.reset": "earliest",
  },
  logger: {
    info: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    warn: () => undefined,
  },
};

export {Database};

export default (options: ConfigInterface): {
  startApplication: (port: number) => Promise<void>,
  database: Database,
  consumer: Consumer,
  expressApplication: Express,
} => {
  const config: ConfigInterface = merge(defaultOptions, options);

  const database = new Database(config);
  const consumer = new Consumer(config, database);
  const expressApplication = createExpressApplication(config, database);

  async function startApplication(port: number) {
    await database.connect();

    // There is no necessity to await the consumer, since the application could already serve requests
    consumer.connect();

    expressApplication.listen(port, (error: any) => {
      if (error) {
        config.logger.error("webserver crashed", {error: error.message});
        process.exit(1);
      } else {
        config.logger.info(`Application listening on port ${port}`);
      }
    });
  }

  return {
    startApplication,
    database,
    consumer,
    expressApplication,
  };
};
