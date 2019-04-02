import {Express} from "express";
import {merge} from "lodash";
import Application from "./lib/Application";
import Database from "./lib/database/Database";
import {createExpressApplication} from "./lib/factories";
import ConfigInterface from "./lib/interfaces/ConfigInterface";
import Consumer from "./lib/kafka/Consumer";

const defaultOptions = {
  kafkaHost: "127.0.0.1:9092",
  // metadata.broker.list MUST be set via kafkaHost-property. If we set it here manually, it will be used as
  // an overwrite.
  //
  // @ts-ignore
  noptions: {
    "group.id": "rewe-duc-content-provider",
    "api.version.request": true,
    "socket.keepalive.enable": true,
  },
  batchConfig: {
    batchSize: 5,
    commitEveryNBatch: 1,
    concurrency: 1,
    commitSync: false,
    noBatchCommits: false,
    manualBatching: true,
    sortedManualBatch: false,
  },
};

export {Application, Database};

export default (options: ConfigInterface): {
  application: Application,
  database: Database,
  consumer: Consumer,
  expressApplication: Express,
} => {
  const config: ConfigInterface = merge(defaultOptions, options);

  const database = new Database(config);
  const consumer = new Consumer(config, database);
  const expressApplication = createExpressApplication(config, database);

  const application = new Application(database, consumer, expressApplication);

  return {
    application,
    database,
    consumer,
    expressApplication,
  };
};
