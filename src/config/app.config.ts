import { constants } from 'src/common/constants';
import { getMetadataArgsStorage } from 'typeorm';

export const appConfig = () => ({
  [constants.DATABASE]: {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: getMetadataArgsStorage().tables.map((tbl) => tbl.target),
    synchronize: true, // IMPORTANT: Turn this off on Production
    timezone: 'Z',
  },
});