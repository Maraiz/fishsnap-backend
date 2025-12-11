    import { Sequelize } from "sequelize";

    const db = new Sequelize('fishsnap', 'backenduser', 'lana123', {
        host: 'localhost',
        dialect: 'mysql',   
    });

    export default db;  