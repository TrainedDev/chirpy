module.exports = (Sequelize, DataTypes) => {
    const user = Sequelize.define("Users", {
        username: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        profileImg: DataTypes.STRING,
        oauth_id: DataTypes.STRING,
    });

    return user;
};
