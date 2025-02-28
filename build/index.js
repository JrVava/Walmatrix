"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
require("reflect-metadata");
const routing_controllers_1 = require("routing-controllers");
const bull_arena_1 = __importDefault(require("bull-arena"));
const bullmq_1 = require("bullmq");
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const path_1 = __importDefault(require("path"));
const baseUrl = __dirname;
// declare var helper:any
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.config();
    }
    config() {
        this.app = (0, routing_controllers_1.useExpressServer)(this.app, {
            cors: true,
            controllers: [
                baseUrl + '/controllers/*{.ts,.js}',
                baseUrl + '/controllers/v2/*{.ts,.js}',
            ],
        });
        //Bull-Areana
        const areanaConfig = (0, bull_arena_1.default)({
            BullMQ: bullmq_1.Queue,
            queues: [
                {
                    name: 'wallmart',
                    type: 'bullmq',
                    hostId: 'wallmart',
                    redis: {
                        host: config_1.config.redis.host,
                        port: config_1.config.redis.port,
                    },
                },
                {
                    name: 'recon',
                    type: 'bullmq',
                    hostId: 'recon',
                    redis: {
                        host: config_1.config.redis.host,
                        port: config_1.config.redis.port,
                    },
                },
                {
                    name: 'advertiser',
                    type: 'bullmq',
                    hostId: 'advertiser',
                    redis: {
                        host: config_1.config.redis.host,
                        port: config_1.config.redis.port,
                    },
                },
                {
                    name: 'advertise-api',
                    type: 'bullmq',
                    hostId: 'advertise-api',
                    redis: {
                        host: config_1.config.redis.host,
                        port: config_1.config.redis.port,
                    },
                },
                {
                    name: 'wallmartQueues',
                    type: 'bullmq',
                    hostId: 'wallmartQueues',
                    redis: {
                        host: config_1.config.redis.host,
                        port: config_1.config.redis.port,
                    },
                },
            ],
        });
        this.app.use('/wallmart/wallmart', areanaConfig);
        this.app.use('/wallmart/wallmart', areanaConfig);
        this.app.get('/download', function (req, res) {
            const file = `logs/combined.log`;
            res.download(file); // Set disposition and send it.
        });
        this.app.get('/download-scrapper-logs', function (req, res) {
            const file = `logs/scrapper-combined.log`;
            res.download(file); // Set disposition and send it.
        });
        this.app.get('server-status', function (req, res) {
            // const file = `logs/scrapper-combined.log`;
            res.status(200);
        });
        this.app.use('/uploads/profile/:imageName', function (req, res) {
            const imageName = req.params.imageName;
            const imagePath = path_1.default.join(__dirname, '/../uploads/profile/', imageName);
            res.sendFile(imagePath);
        });
    }
    start(port) {
        this.app.listen(port);
    }
    test() {
        return { message: 'Hello this for testing purposes' };
    }
}
exports.App = App;
const apps = new App();
apps.start(config_1.config.port || 3000);
//# sourceMappingURL=index.js.map