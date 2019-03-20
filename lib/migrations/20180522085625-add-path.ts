export default {
  down: (queryInterface: any) => {
    return queryInterface.removeColumn("Contents", "path");
  },
  up: (queryInterface: any, sequelize: any) => {
    return queryInterface.addColumn("Contents", "path", sequelize.TEXT);
  },
};
