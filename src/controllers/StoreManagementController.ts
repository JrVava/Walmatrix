import {
    Body,
    Delete,
    Get,
    JsonController,
    Param,
    Post,
    Req,
    Res,
    UseBefore,
} from 'routing-controllers';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Request, Response } from 'express';
import { DataSourceConnection } from '../connection';
import {
    Users,
    UsersSettings,
    StoreConfig,
    AdvertiserManagement,
} from '../entity/Index';

import StoreConfigList from '../types/storeConfigListInterface';
import { WallmartClients } from '../modules/WallmartClients';
import { wallmartQueue } from '../service/queueService';
import AddUpdateStoreCredentials from '../types/addUpdateCredential.type';
import { wallmartQueues } from '../service/walmartQueue';
@JsonController('/store-management')
@UseBefore(loggingMiddleware)
export class StoreManagementController extends DataSourceConnection {
    @Get('/get-store-oold')
    async getStoreOLD(@Req() req: Request) {
        const publicConnection = await this.publicConnection();
        // Below lines for calling Entity of the respective Entities service
        const usersRepository = publicConnection.getRepository(Users);
        const usersSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);

        const email = req.header('email');
        // Below code is for getting User by email address
        let userData = await usersRepository
            .createQueryBuilder('users')
            .select('users.*', 'users')
            .where('users.email = :email', { email: email })
            .getRawOne();
        // Below line will get the store of there respective user settings and user
        const getStoreConfig = await storeConfigRepository
            .createQueryBuilder('store_config')
            .where('store_config.user_id = :user_id', { user_id: userData.id })
            .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
            .getRawMany();

        const storeData: StoreConfigList[] = [];
        if (getStoreConfig.length > 0) {
            for (const store of getStoreConfig) {
                const userSettings = await usersSettingRepository
                    .createQueryBuilder('us')
                    .select('us.id', 'id')
                    .addSelect('us.client_secret', 'client_secret')
                    .addSelect('us.client_id', 'client_id')
                    .addSelect('us.is_connected', 'is_connected')
                    .leftJoin(
                        'advertiser_management',
                        'am',
                        'am.user_setting_id = us.id',
                    )
                    .where('us.user_id = :user_id', { user_id: userData.id })
                    .andWhere('us.store_id = :store_id', {
                        store_id: store.store_config_id,
                    })
                    .getRawOne();
                const storeDataObject: StoreConfigList = {
                    store_id: store.store_config_id,
                    user_id: store.store_config_user_id,
                    store_name:
                        store.store_config_store_name ===
                        `default_${userData.id}`
                            ? 'Default'
                            : store.store_config_store_name,
                    is_active: store.store_config_is_active,
                    userSetting_id: userSettings ? userSettings.id : null,
                    client_id: userSettings ? userSettings.client_id : null,
                    client_secret: userSettings
                        ? userSettings.client_secret
                        : null,
                    is_connected: userSettings
                        ? userSettings.is_connected
                        : null,
                    adversiter_id: userSettings
                        ? userSettings.adversiter_id
                        : null,
                    am: [],
                };
                storeData.push(storeDataObject);
            }
        }
        // // Below line will append the getStoreConfig as store
        userData = { ...userData, store: storeData };
        return userData;
    }

    @Get('/get-store')
    async getStore(@Req() req: Request, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);
        const email = req.header('email');
        const userData = await usersRepository.findOne({
            where: { email: email },
        });
        if (userData) {
            const getCredentialsData = await storeConfigRepository
                .createQueryBuilder('store')
                .leftJoinAndSelect('store.userSetting', 'userSetting')
                .leftJoinAndSelect(
                    'userSetting.advertise_id',
                    'advertise_id',
                    'advertise_id.is_deleted = false',
                )
                .where('store.user_id = :user_id', { user_id: userData.id })
                .andWhere('store.is_deleted = :is_deleted', {
                    is_deleted: false,
                })
                .getMany();
            return getCredentialsData;
        } else {
            return res.status(404).send({
                message: "Sorry, You don't have store please create a store.",
            });
        }
    }

    @Post('/create-store')
    async createStore(
        @Body() store,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const usersSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);

        const email = req.header('email');
        const { client_id, client_secret } = store;
        const store_name = store.store_name
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/[_\s]/g, '_');

        // console.log("client_id >>--> : ",client_id);
        // console.log("client_secret >>--> : ",client_secret);
        // console.log("store_name >>----> : ",store_name);
        // console.log("email >>--->> : ",email);
        // return {}

        const userData = await usersRepository
            .createQueryBuilder('users')
            .select('users.*', 'users')
            .where('users.email = :email', { email: email })
            .getRawOne();
        if (userData) {
            const checkStoreExist = await storeConfigRepository
                .createQueryBuilder('store_config')
                .where('store_config.user_id = :user_id', {
                    user_id: userData.id,
                })
                .andWhere('store_config.store_name = :store_name', {
                    store_name: store_name,
                })
                .andWhere('store_config.is_deleted = :is_deleted', {
                    is_deleted: false,
                })
                .getRawOne();

            const wallmartClients: WallmartClients = new WallmartClients();
            const checkValidCredentials = await wallmartClients.getToken(
                client_id,
                client_secret,
            );
            if (checkValidCredentials.statusCode !== 200) {
                return res.status(401).json({
                    data: userData,
                    message: 'Sorry, client_id and client_secret is not valid.',
                });
            } else {
                if (!checkStoreExist) {
                    const saveStore = await storeConfigRepository.save({
                        store_name: store_name,
                        user_id: userData.id,
                        name: store_name,
                    });
                    if (saveStore.id) {
                        await usersSettingRepository.save({
                            is_connected:
                                checkValidCredentials.statusCode == 200
                                    ? true
                                    : false,
                            client_id: client_id,
                            client_secret: client_secret,
                            store_id: saveStore.id,
                            user_id: userData.id,
                        });
                    }
                    const response = await this.getUserData(saveStore.id);
                    return res.status(200).send({
                        data: response,
                        message: 'Store successfully created',
                    });
                } else {
                    return res
                        .status(404)
                        .send({ message: 'Sorry, Store is already exists' });
                }
            }
        } else {
            return res
                .status(404)
                .send({ message: "Sorry, User Doesn't exist" });
        }

        // await createTenantSchema(schemaName);
    }

    async getUserData(store_id) {
        const publicConnection = await this.publicConnection();
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);
        // Below line will get the store of there respective user settings and user
        const getStoreConfig = await storeConfigRepository
            .createQueryBuilder('store_config')
            .where('store_config.id = :id', { id: store_id })
            .andWhere('store_config.is_deleted = is_deleted', {
                is_deleted: false,
            })
            .getRawOne();
        return getStoreConfig;
    }

    @Post('/add-update-credentials')
    async addUpdateStoreCredentials(
        @Body() userSetting: Partial<AddUpdateStoreCredentials>,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const { client_id, client_secret, store_id, adversiter_id } =
            userSetting;

        const usersSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);
        const advertiseManageRepository =
            publicConnection.getRepository(AdvertiserManagement);

        const getStoreConfig = await storeConfigRepository.findOne({
            where: { id: store_id, is_deleted: false, is_active: true },
        });
        if (getStoreConfig) {
            await storeConfigRepository.update(
                { id: store_id },
                { name: userSetting.name },
            ); //update store name
            const checkSettingExist = await usersSettingRepository.findOne({
                where: {
                    store_id: getStoreConfig.id,
                    user_id: getStoreConfig.user_id,
                },
            });
            let userSettingId;
            if (checkSettingExist) {
                userSettingId = checkSettingExist.id;
                await usersSettingRepository.update(
                    {
                        store_id: getStoreConfig.id,
                    },
                    {
                        client_id: client_id,
                        client_secret: client_secret,
                        store_id: getStoreConfig.id,
                    },
                );
            } else {
                const getStoreUserSetting = await usersSettingRepository.save({
                    store_id: getStoreConfig.id,
                    user_id: getStoreConfig.user_id,
                    client_id: client_id,
                    client_secret: client_secret,
                });
                userSettingId = getStoreUserSetting.id;
            }

            //check user fill first store data
            const [getUserSetting, getUserSettingCount] =
                await usersSettingRepository.findAndCount({
                    where: { user_id: getStoreConfig.user_id },
                });
            const wallmartClients: WallmartClients = new WallmartClients();
            const checkValidCredentials = await wallmartClients.getToken(
                client_id,
                client_secret,
            );
            await usersSettingRepository.update(
                { store_id: getStoreConfig.id },
                {
                    is_connected:
                        checkValidCredentials.statusCode == 200 ? true : false,
                },
            );
            //update advertiser management
            const advIDS = adversiter_id.filter((x) => x);

            await Promise.all(
                advIDS.map(async (advrow) => {
                    if (advrow['id']) {
                        await advertiseManageRepository.update(
                            {
                                id: advrow['id'],
                                user_setting_id: userSettingId,
                            },
                            { advertiser_id: +advrow['advertiser_id'] },
                        );
                    } else {
                        await advertiseManageRepository.save({
                            advertiser_id: +advrow['advertiser_id'],
                            user_setting_id: userSettingId,
                            is_verify: false,
                        });
                    }
                }),
            );

            //get all data from wallmart
            const userSettingData = getUserSetting[0];
            if (
                getUserSettingCount == 1 &&
                (!userSettingData.order_wfs_sync_date ||
                    !userSettingData.order_seller_sync_date ||
                    !userSettingData.order_plfulfilled_sync_date)
            ) {
                const jobData = {
                    client_id: client_id,
                    client_secret: client_secret,
                    schema_name: `default_${getStoreConfig.user_id}`,
                    store_id: store_id,
                    user_setting_id: userSettingId,
                };
                await wallmartQueue.add('getSellerOrder', jobData);
                await wallmartQueue.add('getPLulfilledOrder', jobData);
                await wallmartQueue.add('getWFSOrder', jobData);
                await wallmartQueue.add('download-item-report', jobData);

                // Hit Item Report QueueServic
                const wallmartClients: WallmartClients = new WallmartClients();
                wallmartClients.accessToken = null;
                wallmartClients.clientId = null;
                wallmartClients.clientSecret = null;

                wallmartClients.clientId = client_id;
                wallmartClients.clientSecret = client_secret;
                const requestReportData = await wallmartClients.onRequestReport(
                    'ITEM',
                    'READY',
                );
                const requestID = requestReportData.requests[0].requestId;
                const downloadDetails =
                    await wallmartClients.downloadRequestReport(requestID);
                const itemRepportJobData = {
                    requestURL: downloadDetails.downloadURL,
                    store_id: store_id,
                    schema_name: `default_${getStoreConfig.user_id}`,
                    user_id: getStoreConfig.user_id,
                };
                wallmartQueue.add('download-item-report', itemRepportJobData);

                // Hitting the Recon Avialable Queue

                // const reconAvailableDateJobData = {
                //     clientId: client_id,
                //     clientSecret: client_secret,
                //     user_setting_id: userSettingId,
                // };
                // reconQueue.add(
                //     'recon-available-date',
                //     reconAvailableDateJobData,
                // );

                const data = {
                    user_setting_id: userSettingId,
                    client_id: client_id,
                    client_secret: client_secret,
                };
                await wallmartQueues.add('get-recon-dates', data);
            }
            //get updated record
            const storeData = await usersSettingRepository.findOne({
                where: {
                    store_id: getStoreConfig.id,
                    user_id: getStoreConfig.user_id,
                },
                relations: ['advertise_id'],
            });
            return res.status(200).json({ data: storeData });
        } else {
            return res.status(404).send({
                message: "Sorry, You don't have store please create a store.",
            });
        }
    }

    @Delete('/delete-store/:store_id')
    async deleteStore(
        @Param('store_id') store_id: number,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);
        const checkStoreExit = await storeConfigRepository.findOne({
            where: { id: store_id },
        });
        if (checkStoreExit) {
            await storeConfigRepository.update(
                { id: store_id },
                { is_deleted: true },
            );
            return res.status(200).json({
                message: `Your Store ${checkStoreExit.store_name} has been deleted successfully.`,
            });
        } else {
            return res.status(404).send({ message: 'Sorry, Store not found.' });
        }
    }

    @Delete('/delete-advertise/:adv_id')
    async deleteAdvertise(
        @Param('adv_id') adv_id: number,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const advConfigRepository =
            publicConnection.getRepository(AdvertiserManagement);
        const checkAdvExit = await advConfigRepository.findOne({
            where: { id: adv_id },
        });
        if (checkAdvExit) {
            await advConfigRepository.update(
                { id: adv_id },
                { is_deleted: true },
            );
            return res.status(200).json({
                message: `Your Advertise ${adv_id} has been deleted successfully.`,
            });
        } else {
            return res
                .status(404)
                .send({ message: 'Sorry, Advertise not found.' });
        }
    }
}
