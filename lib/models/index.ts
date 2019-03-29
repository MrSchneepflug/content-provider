import fs from "fs";
import path from "path";
import {Sequelize} from "sequelize";

class Models {
  constructor(private db: Sequelize) {
  }

  public load(): Sequelize {
    const basename: string = path.basename(__filename);

    fs.readdirSync(__dirname)
      .filter((file: string) => {
        return (file.indexOf(".") !== 0) && (file !== basename) &&
          (file.slice(-3) === ".js");
      })
      .forEach((file: string) => {
        const model = this.db.import(path.join(__dirname, file));

        // @todo: Not sure if this is used correctly here. Maybe the models can be stored some other way.
        // @ts-ignore
        this.db[model.name] = model;
      });

    Object.keys(this.db).forEach((modelName) => {
      // @ts-ignore
      if (this.db[modelName].associate) {
        // @ts-ignore
        this.db[modelName].associate(this.db);
      }
    });

    return this.db;
  }
}

export default Models;
