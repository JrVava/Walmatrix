import { Job, Queue, Worker } from 'bullmq';
import redisClient from '../modules/RedisClient';
import { WalmartService } from './WalmartService';

export const wallmartQueues = new Queue('wallmartQueues', {
    connection: redisClient.duplicate(),
});

export const recon = new Worker(
    'wallmartQueues',
    async (job: Job) => {
        // Define your processing logic for 'recon' queue here
        const callingWalartService = new WalmartService();
        switch (job.name) {
            case 'get-recon-dates':
                await callingWalartService.getReconDates(job.data);
                break;
            case 'download-recon-file':
                await callingWalartService.downloadReconFile(job.data);
                break;
            case 'read-recon-file-csv':
                await callingWalartService.readReconCsvData(job.data);
                break;
        }

        return { message: 'hello' };
    },
    { connection: redisClient },
);
