export default interface LoggerInterface {
  info(message: string, additionalFields?: any): void;
  error(message: string, additionalFields?: any): void;
  debug(message: string, additionalFields?: any): void;
  warn(message: string, additionalFields?: any): void;
}
