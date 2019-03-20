export default (sequelize: any, DATA_TYPES: any) => {
  return sequelize.define("Content", {
    content: DATA_TYPES.TEXT,
    id: {
      primaryKey: true,
      type: DATA_TYPES.STRING,
    },
    path: DATA_TYPES.STRING,
  }, {});
};
