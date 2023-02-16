import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  return {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    migrations: ['src/migrations/*{.ts,.js}'],
    entities: [__dirname + '/entities.config.ts'],
    extra: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  } as DataSourceOptions;
}
