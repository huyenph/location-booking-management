export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USER ?? "testing",
    password: process.env.DB_PASSWORD ?? "testing_password",
    name: process.env.DB_NAME ?? "testing",
  },
});
