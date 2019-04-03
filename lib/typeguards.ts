import {KafkaMessage, SortedMessageBatch} from "sinek";

export type SinekMessage = KafkaMessage | KafkaMessage[] | SortedMessageBatch;

export function isKafkaMessage(message: SinekMessage): message is KafkaMessage {
  const isNotArray = !Array.isArray(message);
  const hasAllKafkaMessageProperties = ["topic", "partition", "offset", "key", "value"]
    .map((property: string) => property in message)
    .reduce((previousValue: boolean, currentValue: boolean) => previousValue && currentValue);

  return isNotArray && hasAllKafkaMessageProperties;
}
