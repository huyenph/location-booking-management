import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

process.env.TZ = "UTC";

loadEnv();

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  username: process.env.DB_USER ?? "testing",
  password: process.env.DB_PASSWORD ?? "testing_password",
  database: process.env.DB_NAME ?? "testing",
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
  logging:
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
