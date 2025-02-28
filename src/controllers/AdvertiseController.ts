import { Get, JsonController } from 'routing-controllers';
import { AdsReportManagement, AdvertiserManagement } from '../entity/Index';
import { AdvertiseClient } from '../modules/AdvertiseClient';
import { findLatestDate, getDateBatch } from '../modules/utils';
import moment from 'moment';
import { adsQueue } from '../service/AdsQueue';
import { AdsReportStatus } from '../types/adsTypes/adsReportStatus';
// import logger from '../service/logger';

@JsonController('/advertise')
export class AdvertiseController extends AdvertiseClient {
    constructor() {
        super();
    }
    @Get('/create-snapshot-report')
    async createSnapshopReport() {
        const publicConnection = await this.publicConnection();
        const advertiseManagementRepository =
            publicConnection.getRepository(AdvertiserManagement);
        const getStoreDetails = await this.getUserCredentialsNew();
        let latestDate = null;
        getStoreDetails.forEach(async (element) => {
            const adId = element.advertiser_management_advertiser_id;
            const dateBatch = getDateBatch(
                element.advertiser_management_sync_date,
            );
            latestDate = findLatestDate(dateBatch);

            dateBatch.forEach(async (date) => {
                const startDate = moment(date.startDate).format('YYYY-MM-DD');
                const endDate = moment(date.endDate).format('YYYY-MM-DD');
                const getAdsReportjobData = {
                    ad_id: adId,
                    start_date: startDate,
                    end_date: endDate,
                    report_type: 'adItem',
                    report_metrics: [
                        'date',
                        'campaignId',
                        'adGroupId',
                        'itemId',
                        'numAdsShown',
                        'numAdsClicks',
                        'adSpend',
                        'attributedOrders14days',
                        'attributedSales14days',
                        'advertisedSkuSales14days',
                        'otherSkuSales14days',
                        'unitsSold14days',
                        'advertisedSkuUnits14days',
                        'otherSkuUnits14days',
                        'itemId',
                        'itemName',
                    ],
                    user_setting_id: element.user_settings_id,
                };
                adsQueue.add('get-ads-report', getAdsReportjobData, {
                    removeDependencyOnFailure: true,
                });
            });
            //update latest date
            await advertiseManagementRepository.update(
                {
                    id: element.advertiser_management_id,
                },
                {
                    sync_date: moment(latestDate, 'MM-DD-YYYY').format(
                        'MM/DD/YYYY',
                    ),
                },
            );
        });
        return {};
    }

    @Get('/get-snapshot-report')
    async getSnapshopReport() {
        const publicConnection = await this.publicConnection();
        const adsReportManagementRepository =
            publicConnection.getRepository(AdsReportManagement);
        const getAllPendingFiles = await adsReportManagementRepository
            .createQueryBuilder('ads_manage')
            .leftJoinAndSelect(
                'users_settings',
                'user_settings',
                'user_settings.id=ads_manage.user_setting_id',
            )
            .leftJoin(
                'advertiser_management',
                'advertiser_management',
                'advertiser_management.user_setting_id=user_settings.id',
            )
            .leftJoinAndSelect(
                'store_config',
                'sc',
                'sc.id=user_settings.store_id',
            )
            .where('ads_manage.is_deleted = :is_deleted', { is_deleted: false })
            .andWhere('ads_manage.job_status = :job_status', {
                job_status: 'pending',
            })
            .andWhere('sc.is_deleted = :deleted', { deleted: false })
            .getRawMany();

        getAllPendingFiles.forEach(async (element) => {
            const downloadPath = `${element.user_settings_store_id}/${element.user_settings_user_id}/adsreport/${element.ads_manage_advertise_id}`;
            const adsReportStatus: Partial<AdsReportStatus> = {
                advertise_id: element.ads_manage_advertise_id,
                snapshot_id: element.ads_manage_snapshot_id,
                ads_manage_id: element.ads_manage_id,
                download_path: downloadPath,
            };
            adsQueue.add('ads-report-status', adsReportStatus, {
                removeDependencyOnFailure: true,
            });
        });
        return {};
    }

    @Get('/read-snapshot-report')
    async readSnapshopReport() {
        const publicConnection = await this.publicConnection();
        const adsReportManagementRepository =
            publicConnection.getRepository(AdsReportManagement);
        const getAllReadyFiles = await adsReportManagementRepository
            .createQueryBuilder('ads_manage')
            .leftJoinAndSelect(
                'users_settings',
                'user_settings',
                'user_settings.id=ads_manage.user_setting_id',
            )
            .leftJoin(
                'advertiser_management',
                'advertiser_management',
                'advertiser_management.user_setting_id=user_settings.id',
            )
            .leftJoinAndSelect(
                'store_config',
                'sc',
                'sc.id=user_settings.store_id',
            )
            .where('ads_manage.is_deleted = :is_deleted', { is_deleted: false })
            .andWhere('ads_manage.job_status = :job_status', {
                job_status: 'ready',
            })
            .andWhere('sc.is_deleted = :deleted', { deleted: false })
            .getRawMany();

        getAllReadyFiles.forEach(async (element) => {
            const readFilePath = `${element.user_settings_store_id}/${element.user_settings_user_id}/adsreport/${element.ads_manage_advertise_id}/${element.ads_manage_snapshot_id}.csv`;
            const adsReportStatus: Partial<AdsReportStatus> = {
                advertise_id: element.ads_manage_advertise_id,
                snapshot_id: element.ads_manage_snapshot_id,
                ads_manage_id: element.ads_manage_id,
                download_path: readFilePath,
                user_id: element.user_settings_user_id,
                store_id: element.user_settings_store_id,
            };
            await adsQueue.add('read-ads-report', adsReportStatus, {
                removeDependencyOnFailure: true,
            });
        });
        return {};
    }

    async getUserCredentialsNew() {
        const publicConnection = await this.publicConnection();
        const AdvertiserManagementRepository =
            publicConnection.getRepository(AdvertiserManagement);

        const userSettingData =
            await AdvertiserManagementRepository.createQueryBuilder(
                'advertiser_management',
            )
                .leftJoinAndSelect(
                    'users_settings',
                    'user_settings',
                    'user_settings.id=advertiser_management.user_setting_id',
                )
                .leftJoinAndSelect(
                    'store_config',
                    'sc',
                    'sc.id=user_settings.store_id',
                )
                .where('user_settings.scrapper_disable = :scrapper_disable', {
                    scrapper_disable: true,
                })
                .andWhere('sc.is_deleted = :deleted', { deleted: false })
                .andWhere('advertiser_management.is_verify = :is_verify', {
                    is_verify: true,
                })
                .getRawMany();

        return userSettingData;
    }

    @Get('/get-campaign-report')
    async getCampaignReport() {
        const getStoreDetails = await this.getUserCredentialsNew();
        getStoreDetails.forEach(async (value) => {
            const getCampaignJobData = {
                advertise_id: value.advertiser_management_advertiser_id,
                user_id: value.user_settings_user_id,
                store_id: value.user_settings_store_id,
            };
            await adsQueue.add('get-campaign-report', getCampaignJobData, {
                removeDependencyOnFailure: true,
            });
        });
        return {};
    }
}
