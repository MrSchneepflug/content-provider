import {Logging} from "sequelize";

export default interface DatabaseConfigInterface {
  active?: boolean;
  database: string;
  dialect?: string;
  host: string;
  password: string;
  username: string;
  logging?: Logging["logging"];
  pool?: {
    max?: number;
    min?: number;
    idle?: number;
  };
  port?: number;
  seederStorage?: string;
}
