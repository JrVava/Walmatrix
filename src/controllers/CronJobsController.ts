import moment from 'moment';
import {
    UsersSettings,
    StoreConfig,
    Orders,
    OrderCharges,
    ReconManagement,
    Users,
} from '../entity/Index';
import { Get, JsonController } from 'routing-controllers';
import { WallmartClients } from '../modules/WallmartClients';
import { reconQueue, wallmartQueue } from './../service/queueService';

import logger from '../service/logger';
import { ReturnsController } from './ReturnsController';
import { IsNull } from 'typeorm';

@JsonController('/cron-jobs')
export class CronJobs extends WallmartClients {
    @Get('/get-wfs-order')
    async getWFSOrdersFromWallMart() {
        const tokenExpireTime = moment.duration(900, 'seconds'); // 900 seconds duration
        const credentials = await this.getUserCredentials();

        let data;
        for (
            let credentialsIndex = 0;
            credentialsIndex < credentials.length;
            credentialsIndex++
        ) {
            const currentTime = moment();
            const expireTime = moment().add(tokenExpireTime);
            // Calculate the duration until token expiration
            const duration = expireTime.diff(currentTime);
            // Store the reference to "this" for later use inside setTimeout
            const self = this;

            // Set the timeout to call a function after the duration
            setTimeout(async function () {
                // Call your function here
                await self.getToken(
                    credentials[credentialsIndex].client_id,
                    credentials[credentialsIndex].client_secret,
                );
            }, duration);

            const jobData = {
                client_id: credentials[credentialsIndex].client_id,
                client_secret: credentials[credentialsIndex].client_secret,
                schema_name: credentials[credentialsIndex].schema_name,
                store_id: credentials[credentialsIndex].store_id,
                user_setting_id: credentials[credentialsIndex].user_setting_id,
            };
            await wallmartQueue.add('getWFSOrder', jobData);
        }
        return { data: data };
    }

    @Get('/get-seller-order')
    async getSellerOrdersFromWallMart() {
        const tokenExpireTime = moment.duration(900, 'seconds'); // 900 seconds duration
        const credentials = await this.getUserCredentials();

        let data;
        for (
            let credentialsIndex = 0;
            credentialsIndex < credentials.length;
            credentialsIndex++
        ) {
            const currentTime = moment();
            const expireTime = moment().add(tokenExpireTime);
            // Calculate the duration until token expiration
            const duration = expireTime.diff(currentTime);
            // Store the reference to "this" for later use inside setTimeout
            const self = this;

            // Set the timeout to call a function after the duration
            setTimeout(async function () {
                // Call your function here
                await self.getToken(
                    credentials[credentialsIndex].client_id,
                    credentials[credentialsIndex].client_secret,
                );
            }, duration);

            const jobData = {
                client_id: credentials[credentialsIndex].client_id,
                client_secret: credentials[credentialsIndex].client_secret,
                schema_name: credentials[credentialsIndex].schema_name,
                store_id: credentials[credentialsIndex].store_id,
                user_setting_id: credentials[credentialsIndex].user_setting_id,
            };
            await wallmartQueue.add('getSellerOrder', jobData);
        }
        return { data: data };
    }

    @Get('/get-plfulfilled-order')
    async getPLFulfilledOrdersFromWallMart() {
        const tokenExpireTime = moment.duration(900, 'seconds'); // 900 seconds duration
        const credentials = await this.getUserCredentials();

        let data;
        for (
            let credentialsIndex = 0;
            credentialsIndex < credentials.length;
            credentialsIndex++
        ) {
            const currentTime = moment();
            const expireTime = moment().add(tokenExpireTime);
            // Calculate the duration until token expiration
            const duration = expireTime.diff(currentTime);
            // Store the reference to "this" for later use inside setTimeout
            const self = this;

            // Set the timeout to call a function after the duration
            setTimeout(async function () {
                // Call your function here
                await self.getToken(
                    credentials[credentialsIndex].client_id,
                    credentials[credentialsIndex].client_secret,
                );
            }, duration);

            const jobData = {
                client_id: credentials[credentialsIndex].client_id,
                client_secret: credentials[credentialsIndex].client_secret,
                schema_name: credentials[credentialsIndex].schema_name,
                store_id: credentials[credentialsIndex].store_id,
                user_setting_id: credentials[credentialsIndex].user_setting_id,
            };
            await wallmartQueue.add('getPLulfilledOrder', jobData);
        }
        return { data: data };
    }

    async getUserCredentials() {
        const publicConnection = await this.publicConnection();
        const userSettingData = [];
        const usersSettingRepository =
            publicConnection.getRepository(UsersSettings);

        const getCredentials = await usersSettingRepository
            .createQueryBuilder('us')
            .select('us.client_id', 'client_id')
            .addSelect('us.client_secret', 'client_secret')
            .addSelect('sc.store_name', 'store_name')
            .addSelect('sc.id', 'store_id')
            .addSelect('sc.user_id', 'user_id')
            .addSelect('us.id', 'user_setting_id')
            .addSelect('us.recon_date', 'recon_date')
            .leftJoin('store_config', 'sc', 'us.store_id = sc.id')
            .where('us.is_connected = :is_connected', { is_connected: true })
            .andWhere('sc.is_deleted = :is_deleted', { is_deleted: false })
            // .andWhere('us.store_id = :idd', { idd: 267 })
            .getRawMany();

        getCredentials.map((credential) => {
            userSettingData.push({
                client_id: credential.client_id,
                client_secret: credential.client_secret,
                store_name: credential.store_name,
                store_id: credential.store_id,
                schema_name: `default_${credential.user_id}`,
                user_setting_id: credential.user_setting_id,
                recon_date: credential.recon_date,
                user_id: credential.user_id,
            });
        });
        return userSettingData;
    }

    async getUserCredentialsNew() {
        const publicConnection = await this.publicConnection();
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);

        const userSettingData = await storeConfigRepository
            .createQueryBuilder('store_config')
            .leftJoinAndSelect(
                'users_settings',
                'user_settings',
                'user_settings.store_id=store_config.id',
            )
            .where('user_settings.is_connected = :connected', {
                connected: true,
            })
            .andWhere('store_config.is_deleted = :deleted', { deleted: false })
            .getRawMany();

        return userSettingData;
    }

    @Get('/update-orders')
    async updateOrdersAndOrderCharges() {
        const ordersRepository = (
            await this.connection('default_233')
        ).getRepository(Orders);

        const ordersChargesRepository = (
            await this.connection('default_233')
        ).getRepository(OrderCharges);

        const orders = await ordersRepository.find();

        orders.map(async (order) => {
            const orderLines = order.order_lines.orderLine;
            const orderId = order.id;
            orderLines.map(async (orderLine) => {
                const chargeType =
                    orderLine['charges']['charge'][0]['chargeType'];
                await ordersChargesRepository.update(
                    { order_id: orderId },
                    { charge_type: chargeType },
                );
            });
        });
        return { message: 'hello world' };
    }

    @Get('/return')
    async return() {
        const credentials = await this.getUserCredentials();
        let data;
        for (
            let credentialsIndex = 0;
            credentialsIndex < credentials.length;
            credentialsIndex++
        ) {
            const wallmart = new ReturnsController();
            wallmart.clientId = credentials[credentialsIndex].client_id;
            wallmart.clientSecret = credentials[credentialsIndex].client_secret;
            wallmart.schema_name = credentials[credentialsIndex].schema_name;
            wallmart.store_id = credentials[credentialsIndex].store_id;
            wallmart.user_setting_id =
                credentials[credentialsIndex].user_setting_id;
            data = await wallmart.returnWallmartData();
        }
        return { data: data };
    }

    @Get('/get-item-report')
    async getItemReport() {
        const userSettings = await this.getUserCredentials();

        for (const credential of userSettings) {
            this.clientId = null;
            this.clientSecret = null;
            this.accessToken = null;
            this.clientId = credential.client_id;
            this.clientSecret = credential.client_secret;
            const requestReportData = await this.onRequestReport(
                'ITEM',
                'READY',
            );
            // console.log(requestReportData.requests);
            const requestID = requestReportData.requests[0].requestId;
            const downloadDetails = await this.downloadRequestReport(requestID);
            const jobData = {
                requestURL: downloadDetails.downloadURL,
                store_id: credential.store_id,
                schema_name: credential.schema_name,
                user_id: credential.user_id,
            };
            wallmartQueue.add('download-item-report', jobData);
        }
        return { message: 'Product Image' };
    }

    @Get('/available-recon-date')
    async getAvailReconReport() {
        const userSettings = await this.getUserCredentials();
        // const reconManageRepository = (
        //     await this.publicConnection()
        // ).getRepository(ReconManagement);
        try {
            for (const setting of userSettings) {
                // this.clientId = setting.client_id;
                // this.clientSecret = setting.client_secret;
                const reconAvailableDateJobData = {
                    clientId: setting.client_id,
                    clientSecret: setting.client_secret,
                    user_setting_id: setting.user_setting_id,
                };
                reconQueue.add(
                    'recon-available-date',
                    reconAvailableDateJobData,
                );
                // const getAvailableReconDate = await this.availableReconFiles();

                // if (
                //     getAvailableReconDate &&
                //     getAvailableReconDate.availableApReportDates
                // ) {
                //     const availableReconData = [];
                //     for (const availableDate of getAvailableReconDate.availableApReportDates) {
                //         const reconManageData: Partial<ReconManagement> = {
                //             available_date: availableDate,
                //             user_setting_id: setting.user_setting_id,
                //         };
                //         const checkDataExist =
                //             await reconManageRepository.findOne({
                //                 where: {
                //                     user_setting_id: setting.user_setting_id,
                //                     available_date: availableDate,
                //                 },
                //             });
                //         if (checkDataExist) {
                //             reconManageData.id = checkDataExist.id;
                //         }
                //         availableReconData.push(reconManageData);
                //     }
                //     await reconManageRepository.save(availableReconData);
                // }
            }
        } catch (error) {
            logger.info(`getAvailReconReport function catch block ${error}`);
        }
        return {};
    }

    @Get('/get-available-recon-report')
    async getGetAvailReconReport() {
        const publicConnection = await this.publicConnection();
        const reconManageRepository =
            publicConnection.getRepository(ReconManagement);

        const getAllNotDownloadedFiles = await reconManageRepository
            .createQueryBuilder('recon_manage')
            .leftJoinAndSelect('recon_manage.userSetting', 'setting')
            .where('recon_manage.is_file_downloaded =:is_file_downloaded', {
                is_file_downloaded: false,
            })
            .andWhere('recon_manage.is_deleted = :is_deleted', {
                is_deleted: false,
            })
            .andWhere('setting.is_connected = :is_connected', {
                is_connected: true,
            })
            .getMany();

        for (const notDownloadedFiles of getAllNotDownloadedFiles) {
            this.clientId = notDownloadedFiles.userSetting.client_id;
            this.clientSecret = notDownloadedFiles.userSetting.client_secret;

            const jobData = {
                file_id: notDownloadedFiles.id,
                client_id: notDownloadedFiles.userSetting.client_id,
                client_secret: notDownloadedFiles.userSetting.client_secret,
                available_date: notDownloadedFiles.available_date,
                store_id: String(notDownloadedFiles.userSetting.store_id),
                user_id: notDownloadedFiles.userSetting.user_id,
            };
            reconQueue.add('download-recon-file', jobData);
        }
        return {};
    }

    @Get('/read-recon-report')
    async readReconReport() {
        const publicConnection = await this.publicConnection();
        const reconManageRepository =
            publicConnection.getRepository(ReconManagement);

        const getAllUnreadFiles = await reconManageRepository
            .createQueryBuilder('recon_manage')
            .leftJoinAndSelect('recon_manage.userSetting', 'setting')
            .where('recon_manage.is_file_read =:is_file_read', {
                is_file_read: false,
            })
            .andWhere('recon_manage.is_deleted = :is_deleted', {
                is_deleted: false,
            })
            .andWhere('recon_manage.is_file_downloaded = :is_file_downloaded', {
                is_file_downloaded: true,
            })
            .andWhere('setting.is_connected = :is_connected', {
                is_connected: true,
            })
            .getMany();

        for (const unReadFiles of getAllUnreadFiles) {
            const s3FilePath = `${unReadFiles.userSetting.store_id}/${unReadFiles.userSetting.user_id}/recon/file_${unReadFiles.available_date}-${unReadFiles.userSetting.store_id}.zip`;

            const jobData = {
                user_id: unReadFiles.userSetting.user_id,
                file_path: s3FilePath,
                store_id: unReadFiles.userSetting.store_id,
                file_id: unReadFiles.id,
                available_date: unReadFiles.available_date,
            };
            reconQueue.add('read-recon-file', jobData);
        }
        return {};
    }

    @Get('/check-user-order-monthly')
    async checkUserOrderMonthly() {
        const getCurrentDate = moment();
        const monthEndDate = getCurrentDate.subtract(1, 'day');
        const startDate = monthEndDate.startOf('month').format('YYYY-MM-DD');
        const endDate = monthEndDate.endOf('month').format('YYYY-MM-DD');
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const connection = await this.publicConnection();
        const entityManager = connection.manager;

        const userData = await usersRepository
            .createQueryBuilder('user')
            .select('user.store_name', 'store_name')
            .addSelect('stripe_plan.no_of_orders', 'no_of_orders')
            .leftJoin(
                'stripe_subscriptions',
                'stripe_sub',
                'stripe_sub.stripe_customer_id = user.stripe_customer_id',
            )
            .leftJoin(
                'stripe_plans',
                'stripe_plan',
                'stripe_plan.stripe_price_id = stripe_sub.stripe_price_id',
            )
            .andWhere('user.is_deleted = :is_deleted', { is_deleted: false })
            .andWhere('user.store_name != :store_name', {
                store_name: IsNull(),
            })
            .groupBy('user.store_name, stripe_plan.no_of_orders')
            .getRawMany();

        // const orderArray = [];
        for (let index = 0; index < userData.length; index++) {
            const schema_name = userData[index].store_name;
            const no_of_orders = userData[index].no_of_orders;

            const checkSchemaExistQuery = entityManager
                .createQueryBuilder()
                .select('schema_name')
                .from('information_schema.schemata', 'schema')
                .where('schema_name = :schemaName', {
                    schemaName: schema_name,
                });

            const checkSchemaExist = await checkSchemaExistQuery.getRawMany();

            if (checkSchemaExist.length > 0) {
                const ordersRepository = (
                    await this.connection(schema_name)
                ).getRepository(Orders);

                logger.info(
                    `IN Cron JOB Function name checkUserOrderMonthly Schema ${schema_name} exists.`,
                );

                const orders = await ordersRepository
                    .createQueryBuilder('order')
                    .select('id')
                    .where(
                        'order.formated_date BETWEEN :startDate AND :endDate',
                        {
                            startDate: startDate,
                            endDate: endDate,
                        },
                    )
                    .getCount();

                // orderArray.push({
                //     store_name: schema_name,
                //     orderSize: orders.length,
                //     startDate: startDate,
                //     endDate: endDate,
                // })

                if (orders >= no_of_orders) {
                    await usersRepository.update(
                        { store_name: schema_name },
                        { upgrade_required: true },
                    );
                }
            } else {
                logger.info(
                    `IN Cron JOB Function name checkUserOrderMonthly Schema ${schema_name} does not exist.`,
                );
            }
        }

        // return orderArray
        return {};
    }
}
