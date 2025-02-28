import { Queue, Worker, Job } from 'bullmq';
import redisClient from '../modules/RedisClient';
import { AdsService } from './adsService';
export const adsQueue = new Queue('advertise-api', {
    connection: redisClient.duplicate(),
});

export const adsWorker = new Worker(
    'advertise-api',
    async (job: Job) => {
        const adsService = new AdsService();
        switch (job.name) {
            case 'get-ads-report':
                await adsService.getAdsReport(job.data);
                break;
            case 'get-ads-report-csv':
                await adsService.getAdsCSV(job.data);
                break;

            case 'ads-report-status':
                await adsService.getReportStatus(job.data);
                break;

            case 'read-ads-report':
                await adsService.readAdsReport(job.data);
                break;

            case 'get-campaign-report':
                await adsService.getCampaignReport(job.data);
                break;
            default:
                break;
        }
        return 'Success';
    },
    { connection: redisClient },
);
