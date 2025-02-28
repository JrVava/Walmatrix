import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export interface connectionDataSourceOption extends PostgresConnectionOptions {
    schema: string;
    name: string;
}
