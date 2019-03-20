export default {
  down: (queryInterface: any) => {
    return queryInterface.dropTable("Contents");
  },
  up: (queryInterface: any, sequelize: any) => {
    return queryInterface.createTable("Contents", {
      content: {
        type: sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: sequelize.DATE,
      },
      id: {
        allowNull: false,
        primaryKey: true,
        type: sequelize.STRING,
      },
      updatedAt: {
        allowNull: false,
        type: sequelize.DATE,
      },
    });
  },
};
