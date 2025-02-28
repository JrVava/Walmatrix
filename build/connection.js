"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceConnection = void 0;
const typeorm_1 = require("typeorm");
const config_1 = require("./config");
class DataSourceConnection {
    constructor() {
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
        this.connection = (schema) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.options.schema = schema;
                this.options.name = schema;
                this.dataSources = new typeorm_1.DataSource(this.options);
                return yield this.dataSources.initialize();
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.publicConnection = () => __awaiter(this, void 0, void 0, function* () {
            try {
                this.publicSources = new typeorm_1.DataSource(this.publicOptions); // Initialize publicSources
                return yield this.publicSources.initialize();
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.options = {
            type: 'postgres',
            host: config_1.config.databases.host,
            port: config_1.config.databases.port,
            username: config_1.config.databases.username,
            password: config_1.config.databases.password,
            database: config_1.config.databases.database,
            schema: '',
            name: '',
            synchronize: false,
            logging: false,
            entities: [__dirname + '/entity/*{.ts,.js}'],
        };
        this.publicOptions = {
            type: 'postgres',
            host: config_1.config.databases.host,
            port: config_1.config.databases.port,
            username: config_1.config.databases.username,
            password: config_1.config.databases.password,
            database: config_1.config.databases.database,
            schema: 'public',
            synchronize: false,
            name: 'public',
            logging: false,
            entities: [__dirname + '/entity/*{.ts,.js}'],
        };
    }
}
exports.DataSourceConnection = DataSourceConnection;
//# sourceMappingURL=connection.js.map