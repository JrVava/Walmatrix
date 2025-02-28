import axios from 'axios';
import { AwsService } from './awsService';
import path from 'path';
import { AdvertiseClient } from '../modules/AdvertiseClient';
import {
    AdsReportManagement,
    Advertisers,
    CampaignSnapshot,
} from '../entity/Index';
import { adsQueue } from './AdsQueue';
import { AdsReportStatus } from '../types/adsTypes/adsReportStatus';
import logger from './logger';
import { streamToString } from '../modules/utils';
import { AdItem } from '../types/adsTypes/adItem';
import { AdItemResponse } from '../types/adsTypes/adItemResponse';
import { CampaignApiReport } from '../types/adsTypes/campaignApiResponse';

export class AdsService extends AdvertiseClient {
    public async getAdsReport(data: AdsReportStatus) {
        const publicConnection = await this.publicConnection();
        const adsReportManagementRepository =
            publicConnection.getRepository(AdsReportManagement);
        this.requestData = {
            advertiserId: data.ad_id,
            startDate: data.start_date,
            endDate: data.end_date,
            reportType: data.report_type,
            reportMetrics: data.report_metrics,
        };
        const returnResult: AdItemResponse =
            await this.generateSnapshotReport();
        const snapshotResultData: Partial<AdsReportManagement> = {
            advertise_id: data.ad_id,
            snapshot_id: returnResult.snapshotId,
            job_status: returnResult.jobStatus,
            start_date: data.start_date,
            end_date: data.end_date,
            report_type: data.report_type,
            user_setting_id: data.user_setting_id,
        };
        //save api reponse
        await adsReportManagementRepository.save(snapshotResultData);
        await publicConnection.destroy();
    }

    public async getAdsCSV(data) {
        const publicConnection = await this.publicConnection();
        const adsReportManagementRepository =
            publicConnection.getRepository(AdsReportManagement);
        const reportResponse = await axios.get(data.reportLink, {
            responseType: 'arraybuffer',
        });
        const s3Client = new AwsService();
        const fileName = `${path.basename(data.reportLink)}.csv`;
        try {
            const fileUploaded = await s3Client.uploadBuferToS3(
                `${data.downloadPath}/${fileName}`,
                reportResponse.data,
            );
            if (
                fileUploaded &&
                fileUploaded.result?.$metadata?.httpStatusCode == 200
            ) {
                const snapshotResultData: Partial<AdsReportManagement> = {
                    id: data.advertise_id,
                    job_status: 'ready',
                };
                await adsReportManagementRepository.save(snapshotResultData);
            }
        } catch (error) {
            logger.error('HERE IS ERROR IN UPLOAD S3 PPC REPORT', error);
        }
    }

    public async getReportStatus(data: AdsReportStatus) {
        if (data.snapshot_id && data.advertise_id) {
            const publicConnection = await this.publicConnection();
            const adsReportManagementRepository =
                publicConnection.getRepository(AdsReportManagement);

            const getReportDetails = await this.getSnapshotReports(
                data.advertise_id,
                data.snapshot_id,
            );
            const snapshotResultData: Partial<AdsReportManagement> = {
                id: data.ads_manage_id,
                job_status: getReportDetails.jobStatus,
                report_link: getReportDetails.details,
            };
            //save api reponse
            await adsReportManagementRepository.save(snapshotResultData);
            const getAdsReportCsvJobData = {
                reportLink: getReportDetails.details,
                downloadPath: data.download_path,
                advertise_id: data.ads_manage_id,
            };
            await adsQueue.add('get-ads-report-csv', getAdsReportCsvJobData, {
                removeDependencyOnFailure: true,
            });
        }
    }

    public async readAdsReport(jobData: AdsReportStatus) {
        const s3Client = new AwsService();
        const s3Response = await s3Client.readCSV(jobData.download_path);
        if (s3Response && s3Response?.$metadata?.httpStatusCode == 200) {
            const publicConnection = await this.publicConnection();
            const adsReportManagementRepository =
                publicConnection.getRepository(AdsReportManagement);

            //open store database connection
            const advertisersRepository = (
                await this.connection(`default_${jobData.user_id}`)
            ).getRepository(Advertisers);
            const objectBody: any = s3Response.Body;
            const bodyContents = await streamToString(objectBody);
            const csvDatas: any = await bodyContents;
            const result = await Promise.all(
                csvDatas.map(async (data: AdItem) => {
                    const adSales = +data.attributedSales14days;
                    const adSpend = +data.adSpend;
                    const clicks = +data.numAdsClicks;
                    const impressions = +data.numAdsShown;
                    const unitSold = +data.unitsSold14days;
                    const orders = +data.attributedOrders14days;

                    let roasData = 0;
                    let ctr = 0;
                    let conversion_rate = 0;
                    let conversion_rate_order_based = 0;
                    if (adSales && adSpend) {
                        roasData = +(adSales / adSpend).toPrecision(2);
                    }

                    if (clicks && impressions) {
                        ctr = +(clicks / impressions).toPrecision(2);
                    }

                    if (unitSold && clicks) {
                        conversion_rate = +(unitSold / clicks).toPrecision(2);
                    }

                    if (orders && clicks) {
                        conversion_rate_order_based = +(
                            orders / clicks
                        ).toPrecision(2);
                    }
                    const advertiseData: Partial<Advertisers> = {
                        date: data.date,
                        campaign_id: +data.campaignId,
                        impressions: impressions,
                        clicks: clicks,
                        ad_spend: +data.adSpend,
                        orders: orders,
                        total_attributed_sales: +data.attributedSales14days,
                        other_sku_sales: +data.otherSkuSales14days,
                        advertised_sku_sales: +data.advertisedSkuSales14days,
                        ad_group_id: +data.adGroupId,
                        search_keyword: '',
                        units_sold: unitSold,
                        advertise_sku_units: +data.advertisedSkuUnits14days,
                        other_sku_units: +data.otherSkuUnits14days,
                        roas: roasData,
                        store_id: jobData.store_id,
                        item_id: +data.itemId,
                        item_name: data.itemName,
                        bidded_keyword: '',
                        match_type: '',
                        ctr: ctr,
                        conversion_rate: conversion_rate,
                        conversion_rate_order_based:
                            conversion_rate_order_based,
                    };
                    const checkAdvData = await advertisersRepository.findOne({
                        where: {
                            date: data.date,
                            campaign_id: +data.campaignId,
                            ad_group_id: +data.adGroupId,
                            item_id: +data.itemId,
                            store_id: jobData.store_id,
                        },
                    });
                    if (checkAdvData) {
                        advertiseData['id'] = checkAdvData.id;
                    }
                    return advertiseData;
                }),
            );
            await advertisersRepository.save(result, { chunk: 100 });
            await (
                await this.connection(`default_${jobData.user_id}`)
            ).destroy();
            await adsReportManagementRepository.save({
                id: jobData.ads_manage_id,
                job_status: 'completed',
            });
            await publicConnection.destroy();
        }
    }

    public async getCampaignReport(jobData: AdsReportStatus) {
        const campaignSnapsShotReport = (
            await this.connection(`default_${jobData.user_id}`)
        ).getRepository(CampaignSnapshot);
        const getCampaignResult: CampaignApiReport[] =
            await this.getCampaignReports(jobData.advertise_id);
        const getAllReportData = await Promise.all(
            getCampaignResult.map(async (value) => {
                //check record exist or not
                const checkRecordExist = await campaignSnapsShotReport.findOne({
                    where: {
                        store_id: jobData.store_id,
                        campaign_id: value.campaignId,
                        advertiser_id: value.advertiserId,
                        start_date: value.startDate,
                        end_date: value.endDate,
                    },
                });

                const campaignData: Partial<CampaignSnapshot> = {
                    name: value.name,
                    campaign_type: value.campaignType,
                    targeting_type: value.targetingType,
                    status: value.status,
                    budget_type: value.budgetType,
                    start_date: value.startDate,
                    end_date: value.endDate,
                    total_budget: value.totalBudget,
                    daily_budget: value.dailyBudget,
                    rollover: value.rollover,
                    advertiser_id: value.advertiserId,
                    campaign_id: value.campaignId,
                    channel: value.channel,
                    store_id: jobData.store_id,
                };
                if (checkRecordExist) {
                    campaignData['id'] = checkRecordExist.id;
                }
                return campaignData;
            }),
        );
        await campaignSnapsShotReport.save(getAllReportData, { chunk: 100 });
    }
}
