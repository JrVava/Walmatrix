import { DataSource } from 'typeorm';
import { config } from './config';
import { connectionDataSourceOption } from './types/connectinDataSourceOptionInterface';

export class DataSourceConnection {
    private options: connectionDataSourceOption;
    private dataSources: DataSource;

    private publicOptions: connectionDataSourceOption;
    private publicSources: DataSource;

    constructor() {
        this.options = {
            type: 'postgres',
            host: config.databases.host,
            port: config.databases.port,
            username: config.databases.username,
            password: config.databases.password,
            database: config.databases.database,
            schema: '',
            name: '',
            synchronize: false,
            logging: false,
            entities: [__dirname + '/entity/*{.ts,.js}'],
        };

        this.publicOptions = {
            type: 'postgres',
            host: config.databases.host,
            port: config.databases.port,
            username: config.databases.username,
            password: config.databases.password,
            database: config.databases.database,
            schema: 'public',
            synchronize: false,
            name: 'public',
            logging: false,
            entities: [__dirname + '/entity/*{.ts,.js}'],
        };
    }

    // connection = async (schema = "public") => {
    //   try {
    //     // if (schema !== "public") {
    //     this.options.schema = schema;
    //     // } else {
    //     //   this.options.schema = "public";
    //     // }
    //     this.dataSources = new DataSource(this.options);
    //     return await this.dataSources.initialize();
    //   } catch (error) {
    //     throw new Error(error.message);
    //   }
    // };
    // connection = async (schema = 'public') => {
    //     try {
    //         if (schema !== 'public') {
    //             this.options.schema = schema;
    //             this.options.name = schema;
    //         } else {
    //             this.options.schema = 'public';
    //             this.options.name = 'public';
    //         }
    //         this.dataSources = new DataSource(this.options);
    //         return await this.dataSources.initialize();
    //     } catch (error) {
    //         throw new Error(error.message);
    //     }
    // };

    connection = async (schema) => {
        try {
            this.options.schema = schema;
            this.options.name = schema;
            this.dataSources = new DataSource(this.options);
            return await this.dataSources.initialize();
        } catch (error) {
            throw new Error(error.message);
        }
    };

    publicConnection = async () => {
        try {
            this.publicSources = new DataSource(this.publicOptions); // Initialize publicSources
            return await this.publicSources.initialize();
        } catch (error) {
            throw new Error(error.message);
        }
    };
}
