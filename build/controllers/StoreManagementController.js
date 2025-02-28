"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
exports.StoreManagementController = void 0;
const routing_controllers_1 = require("routing-controllers");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const WallmartClients_1 = require("../modules/WallmartClients");
const queueService_1 = require("../service/queueService");
let StoreManagementController = class StoreManagementController extends connection_1.DataSourceConnection {
    getStoreOLD(req) {
        return __awaiter(this, void 0, void 0, function* () {
            // Below lines for calling Entity of the respective Entities service
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const usersSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const email = req.header('email');
            // Below code is for getting User by email address
            let userData = yield usersRepository
                .createQueryBuilder('users')
                .select('users.*', 'users')
                .where('users.email = :email', { email: email })
                .getRawOne();
            // Below line will get the store of there respective user settings and user
            const getStoreConfig = yield storeConfigRepository
                .createQueryBuilder('store_config')
                .where('store_config.user_id = :user_id', { user_id: userData.id })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .getRawMany();
            const storeData = [];
            if (getStoreConfig.length > 0) {
                for (const store of getStoreConfig) {
                    const userSettings = yield usersSettingRepository
                        .createQueryBuilder('us')
                        .select('us.id', 'id')
                        .addSelect('us.client_secret', 'client_secret')
                        .addSelect('us.client_id', 'client_id')
                        .addSelect('us.is_connected', 'is_connected')
                        .leftJoin('advertiser_management', 'am', 'am.user_setting_id = us.id')
                        .where('us.user_id = :user_id', { user_id: userData.id })
                        .andWhere('us.store_id = :store_id', {
                        store_id: store.store_config_id,
                    })
                        .getRawOne();
                    const storeDataObject = {
                        store_id: store.store_config_id,
                        user_id: store.store_config_user_id,
                        store_name: store.store_config_store_name ===
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
            userData = Object.assign(Object.assign({}, userData), { store: storeData });
            return userData;
        });
    }
    getStore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const email = req.header('email');
            const userData = yield usersRepository.findOne({
                where: { email: email },
            });
            if (userData) {
                const getCredentialsData = yield storeConfigRepository
                    .createQueryBuilder('store')
                    .leftJoinAndSelect('store.userSetting', 'userSetting')
                    .leftJoinAndSelect('userSetting.advertise_id', 'advertise_id', 'advertise_id.is_deleted = false')
                    .where('store.user_id = :user_id', { user_id: userData.id })
                    .andWhere('store.is_deleted = :is_deleted', {
                    is_deleted: false,
                })
                    .getMany();
                return getCredentialsData;
            }
            else {
                return res.status(404).send({
                    message: "Sorry, You don't have store please create a store.",
                });
            }
        });
    }
    createStore(store, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const usersSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
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
            const userData = yield usersRepository
                .createQueryBuilder('users')
                .select('users.*', 'users')
                .where('users.email = :email', { email: email })
                .getRawOne();
            if (userData) {
                const checkStoreExist = yield storeConfigRepository
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
                const wallmartClients = new WallmartClients_1.WallmartClients();
                const checkValidCredentials = yield wallmartClients.getToken(client_id, client_secret);
                if (checkValidCredentials.statusCode !== 200) {
                    return res.status(401).json({
                        data: userData,
                        message: 'Sorry, client_id and client_secret is not valid.',
                    });
                }
                else {
                    if (!checkStoreExist) {
                        const saveStore = yield storeConfigRepository.save({
                            store_name: store_name,
                            user_id: userData.id,
                            name: store_name,
                        });
                        if (saveStore.id) {
                            yield usersSettingRepository.save({
                                is_connected: checkValidCredentials.statusCode == 200
                                    ? true
                                    : false,
                                client_id: client_id,
                                client_secret: client_secret,
                                store_id: saveStore.id,
                                user_id: userData.id,
                            });
                        }
                        const response = yield this.getUserData(saveStore.id);
                        return res.status(200).send({
                            data: response,
                            message: 'Store successfully created',
                        });
                    }
                    else {
                        return res
                            .status(404)
                            .send({ message: 'Sorry, Store is already exists' });
                    }
                }
            }
            else {
                return res
                    .status(404)
                    .send({ message: "Sorry, User Doesn't exist" });
            }
            // await createTenantSchema(schemaName);
        });
    }
    getUserData(store_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            // Below line will get the store of there respective user settings and user
            const getStoreConfig = yield storeConfigRepository
                .createQueryBuilder('store_config')
                .where('store_config.id = :id', { id: store_id })
                .andWhere('store_config.is_deleted = is_deleted', {
                is_deleted: false,
            })
                .getRawOne();
            return getStoreConfig;
        });
    }
    addUpdateStoreCredentials(userSetting, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client_id, client_secret, store_id, adversiter_id } = userSetting;
            const usersSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const advertiseManageRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserManagement);
            const getStoreConfig = yield storeConfigRepository.findOne({
                where: { id: store_id, is_deleted: false, is_active: true },
            });
            if (getStoreConfig) {
                yield storeConfigRepository.update({ id: store_id }, { name: userSetting.name }); //update store name
                const checkSettingExist = yield usersSettingRepository.findOne({
                    where: {
                        store_id: getStoreConfig.id,
                        user_id: getStoreConfig.user_id,
                    },
                });
                let userSettingId;
                if (checkSettingExist) {
                    userSettingId = checkSettingExist.id;
                    yield usersSettingRepository.update({
                        store_id: getStoreConfig.id,
                    }, {
                        client_id: client_id,
                        client_secret: client_secret,
                        store_id: getStoreConfig.id,
                    });
                }
                else {
                    const getStoreUserSetting = yield usersSettingRepository.save({
                        store_id: getStoreConfig.id,
                        user_id: getStoreConfig.user_id,
                        client_id: client_id,
                        client_secret: client_secret,
                    });
                    userSettingId = getStoreUserSetting.id;
                }
                //check user fill first store data
                const [getUserSetting, getUserSettingCount] = yield usersSettingRepository.findAndCount({
                    where: { user_id: getStoreConfig.user_id },
                });
                const wallmartClients = new WallmartClients_1.WallmartClients();
                const checkValidCredentials = yield wallmartClients.getToken(client_id, client_secret);
                yield usersSettingRepository.update({ store_id: getStoreConfig.id }, {
                    is_connected: checkValidCredentials.statusCode == 200 ? true : false,
                });
                //update advertiser management
                const advIDS = adversiter_id.filter((x) => x);
                yield Promise.all(advIDS.map((advrow) => __awaiter(this, void 0, void 0, function* () {
                    if (advrow['id']) {
                        yield advertiseManageRepository.update({
                            id: advrow['id'],
                            user_setting_id: userSettingId,
                        }, { advertiser_id: +advrow['advertiser_id'] });
                    }
                    else {
                        yield advertiseManageRepository.save({
                            advertiser_id: +advrow['advertiser_id'],
                            user_setting_id: userSettingId,
                            is_verify: false,
                        });
                    }
                })));
                //get all data from wallmart
                const userSettingData = getUserSetting[0];
                if (getUserSettingCount == 1 &&
                    (!userSettingData.order_wfs_sync_date ||
                        !userSettingData.order_seller_sync_date ||
                        !userSettingData.order_plfulfilled_sync_date)) {
                    const jobData = {
                        client_id: client_id,
                        client_secret: client_secret,
                        schema_name: `default_${getStoreConfig.user_id}`,
                        store_id: store_id,
                        user_setting_id: userSettingId,
                    };
                    yield queueService_1.wallmartQueue.add('getSellerOrder', jobData);
                    yield queueService_1.wallmartQueue.add('getPLulfilledOrder', jobData);
                    yield queueService_1.wallmartQueue.add('getWFSOrder', jobData);
                    yield queueService_1.wallmartQueue.add('download-item-report', jobData);
                    // Hit Item Report QueueServic
                    const wallmartClients = new WallmartClients_1.WallmartClients();
                    wallmartClients.accessToken = null;
                    wallmartClients.clientId = null;
                    wallmartClients.clientSecret = null;
                    wallmartClients.clientId = client_id;
                    wallmartClients.clientSecret = client_secret;
                    const requestReportData = yield wallmartClients.onRequestReport('ITEM', 'READY');
                    const requestID = requestReportData.requests[0].requestId;
                    const downloadDetails = yield wallmartClients.downloadRequestReport(requestID);
                    const itemRepportJobData = {
                        requestURL: downloadDetails.downloadURL,
                        store_id: store_id,
                        schema_name: `default_${getStoreConfig.user_id}`,
                        user_id: getStoreConfig.user_id,
                    };
                    queueService_1.wallmartQueue.add('download-item-report', itemRepportJobData);
                    // Hitting the Recon Avialable Queue
                    const reconAvailableDateJobData = {
                        clientId: client_id,
                        clientSecret: client_secret,
                        user_setting_id: userSettingId,
                    };
                    queueService_1.reconQueue.add('recon-available-date', reconAvailableDateJobData);
                }
                //get updated record
                const storeData = yield usersSettingRepository.findOne({
                    where: {
                        store_id: getStoreConfig.id,
                        user_id: getStoreConfig.user_id,
                    },
                    relations: ['advertise_id'],
                });
                return res.status(200).json({ data: storeData });
            }
            else {
                return res.status(404).send({
                    message: "Sorry, You don't have store please create a store.",
                });
            }
        });
    }
    deleteStore(store_id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const checkStoreExit = yield storeConfigRepository.findOne({
                where: { id: store_id },
            });
            if (checkStoreExit) {
                yield storeConfigRepository.update({ id: store_id }, { is_deleted: true });
                return res.status(200).json({
                    message: `Your Store ${checkStoreExit.store_name} has been deleted successfully.`,
                });
            }
            else {
                return res.status(404).send({ message: 'Sorry, Store not found.' });
            }
        });
    }
    deleteAdvertise(adv_id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const advConfigRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserManagement);
            const checkAdvExit = yield advConfigRepository.findOne({
                where: { id: adv_id },
            });
            if (checkAdvExit) {
                yield advConfigRepository.update({ id: adv_id }, { is_deleted: true });
                return res.status(200).json({
                    message: `Your Advertise ${adv_id} has been deleted successfully.`,
                });
            }
            else {
                return res
                    .status(404)
                    .send({ message: 'Sorry, Advertise not found.' });
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/get-store-oold'),
    __param(0, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "getStoreOLD", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-store'),
    __param(0, (0, routing_controllers_1.Req)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "getStore", null);
__decorate([
    (0, routing_controllers_1.Post)('/create-store'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Req)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "createStore", null);
__decorate([
    (0, routing_controllers_1.Post)('/add-update-credentials'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Req)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "addUpdateStoreCredentials", null);
__decorate([
    (0, routing_controllers_1.Delete)('/delete-store/:store_id'),
    __param(0, (0, routing_controllers_1.Param)('store_id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "deleteStore", null);
__decorate([
    (0, routing_controllers_1.Delete)('/delete-advertise/:adv_id'),
    __param(0, (0, routing_controllers_1.Param)('adv_id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], StoreManagementController.prototype, "deleteAdvertise", null);
StoreManagementController = __decorate([
    (0, routing_controllers_1.JsonController)('/store-management'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], StoreManagementController);
exports.StoreManagementController = StoreManagementController;
//# sourceMappingURL=StoreManagementController.js.map