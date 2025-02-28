import 'reflect-metadata';
import { useExpressServer } from 'routing-controllers';
import Arena from 'bull-arena';
import { Queue } from 'bullmq';

import express from 'express';
import { config } from './config';
import path from 'path';
const baseUrl = __dirname;
// declare var helper:any
export class App {
    public app: express.Application;

    constructor() {
        this.app = express();
        this.config();
    }

    private config() {
        this.app = useExpressServer(this.app, {
            cors: true,
            controllers: [
                baseUrl + '/controllers/*{.ts,.js}',
                baseUrl + '/controllers/v2/*{.ts,.js}',
            ],
        });

        //Bull-Areana
        const areanaConfig = Arena({
            BullMQ: Queue,
            queues: [
                {
                    name: 'wallmart',
                    type: 'bullmq',
                    hostId: 'wallmart',
                    redis: {
                        host: config.redis.host,
                        port: config.redis.port,
                    },
                },
                {
                    name: 'recon',
                    type: 'bullmq',
                    hostId: 'recon',
                    redis: {
                        host: config.redis.host,
                        port: config.redis.port,
                    },
                },
                {
                    name: 'advertiser',
                    type: 'bullmq',
                    hostId: 'advertiser',
                    redis: {
                        host: config.redis.host,
                        port: config.redis.port,
                    },
                },
                {
                    name: 'advertise-api',
                    type: 'bullmq',
                    hostId: 'advertise-api',
                    redis: {
                        host: config.redis.host,
                        port: config.redis.port,
                    },
                },
                {
                    name: 'wallmartQueues',
                    type: 'bullmq',
                    hostId: 'wallmartQueues',
                    redis: {
                        host: config.redis.host,
                        port: config.redis.port,
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
            const imagePath = path.join(
                __dirname,
                '/../uploads/profile/',
                imageName,
            );
            res.sendFile(imagePath);
        });
    }

    public start(port: number) {
        this.app.listen(port);
    }

    public test() {
        return { message: 'Hello this for testing purposes' };
    }
}

const apps = new App();
apps.start(config.port || 3000);
