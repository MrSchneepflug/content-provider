import {merge} from "lodash";
import Application from "./lib/Application";
import Database from "./lib/database/Database";
import {createExpressApplication} from "./lib/factories";
import ConfigInterface from "./lib/interfaces/ConfigInterface";
import ContentInterface from "./lib/interfaces/ContentInterface";
import Consumer from "./lib/kafka/Consumer";

const defaultOptions = {
  consumeWithBackpressure: true,
  kafkaHost: "127.0.0.1:9092",
  options: {
    ackTimeoutMs: 100,
    autoCommit: true,
    autoCommitIntervalMs: 1000,
    fetchMaxBytes: 1024 * 512,
    fetchMaxWaitMs: 10,
    fetchMinBytes: 1,
    fromOffset: "earliest",
    heartbeatInterval: 250,
    partitionerType: 3,
    protocol: ["roundrobin"],
    requireAcks: 1,
    retryMinTimeout: 250,
    sessionTimeout: 8000,
    ssl: false,
  },
  produceFlushEveryMs: 1000,
  producerPartitionCount: 1,
  workerPerPartition: 1,
};

let server: Application;

export const getByPath = async (path: string): Promise<ContentInterface | null> => {
  if (server) {
    const database = server.getDatabase();
    return await database.getByPath(path);
  }

  return null;
};

export default (options: ConfigInterface): Application => {
  const config: ConfigInterface = merge(defaultOptions, options);

  const database = new Database(config);
  const consumer = new Consumer(config, database);
  const expressApplication = createExpressApplication(config, database);

  server = new Application(database, consumer, expressApplication);

  return server;
};
