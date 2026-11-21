import { Sequelize } from 'sequelize';
import path from 'path';
import './LoadEnvConfig.js';
import { ROOT_DIR } from './Paths.js';

const isSqlite = (process.env.DB_DIALECT || '').toLowerCase() === 'sqlite';

const sequelize = isSqlite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE 
        ? path.resolve(ROOT_DIR, process.env.DB_STORAGE) 
        : path.resolve(ROOT_DIR, 'database.sqlite'),
      logging: false
    })
  : new Sequelize(
      process.env.DB_NAME || 'autofix_db',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        dialect: (process.env.DB_DIALECT || 'mysql').toLowerCase(),
        logging: false
      }
    );

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    const dialectName = isSqlite ? 'SQLite' : (process.env.DB_DIALECT || 'MySQL');
    console.log(`[Database] Conexión establecida correctamente con ${dialectName}.`);
  } catch (error) {
    console.error('[Database] Error al conectar con la base de datos:', error);
  }
};

export default sequelize;
