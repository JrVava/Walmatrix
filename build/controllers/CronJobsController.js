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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJobs = void 0;
const moment_1 = __importDefault(require("moment"));
const Index_1 = require("../entity/Index");
const routing_controllers_1 = require("routing-controllers");
const WallmartClients_1 = require("../modules/WallmartClients");
const queueService_1 = require("./../service/queueService");
const logger_1 = __importDefault(require("../service/logger"));
const ReturnsController_1 = require("./ReturnsController");
const typeorm_1 = require("typeorm");
let CronJobs = class CronJobs extends WallmartClients_1.WallmartClients {
    getWFSOrdersFromWallMart() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenExpireTime = moment_1.default.duration(900, 'seconds'); // 900 seconds duration
            const credentials = yield this.getUserCredentials();
            let data;
            for (let credentialsIndex = 0; credentialsIndex < credentials.length; credentialsIndex++) {
                const currentTime = (0, moment_1.default)();
                const expireTime = (0, moment_1.default)().add(tokenExpireTime);
                // Calculate the duration until token expiration
                const duration = expireTime.diff(currentTime);
                // Store the reference to "this" for later use inside setTimeout
                const self = this;
                // Set the timeout to call a function after the duration
                setTimeout(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // Call your function here
                        yield self.getToken(credentials[credentialsIndex].client_id, credentials[credentialsIndex].client_secret);
                    });
                }, duration);
                const jobData = {
                    client_id: credentials[credentialsIndex].client_id,
                    client_secret: credentials[credentialsIndex].client_secret,
                    schema_name: credentials[credentialsIndex].schema_name,
                    store_id: credentials[credentialsIndex].store_id,
                    user_setting_id: credentials[credentialsIndex].user_setting_id,
                };
                yield queueService_1.wallmartQueue.add('getWFSOrder', jobData);
            }
            return { data: data };
        });
    }
    getSellerOrdersFromWallMart() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenExpireTime = moment_1.default.duration(900, 'seconds'); // 900 seconds duration
            const credentials = yield this.getUserCredentials();
            let data;
            for (let credentialsIndex = 0; credentialsIndex < credentials.length; credentialsIndex++) {
                const currentTime = (0, moment_1.default)();
                const expireTime = (0, moment_1.default)().add(tokenExpireTime);
                // Calculate the duration until token expiration
                const duration = expireTime.diff(currentTime);
                // Store the reference to "this" for later use inside setTimeout
                const self = this;
                // Set the timeout to call a function after the duration
                setTimeout(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // Call your function here
                        yield self.getToken(credentials[credentialsIndex].client_id, credentials[credentialsIndex].client_secret);
                    });
                }, duration);
                const jobData = {
                    client_id: credentials[credentialsIndex].client_id,
                    client_secret: credentials[credentialsIndex].client_secret,
                    schema_name: credentials[credentialsIndex].schema_name,
                    store_id: credentials[credentialsIndex].store_id,
                    user_setting_id: credentials[credentialsIndex].user_setting_id,
                };
                yield queueService_1.wallmartQueue.add('getSellerOrder', jobData);
            }
            return { data: data };
        });
    }
    getPLFulfilledOrdersFromWallMart() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenExpireTime = moment_1.default.duration(900, 'seconds'); // 900 seconds duration
            const credentials = yield this.getUserCredentials();
            let data;
            for (let credentialsIndex = 0; credentialsIndex < credentials.length; credentialsIndex++) {
                const currentTime = (0, moment_1.default)();
                const expireTime = (0, moment_1.default)().add(tokenExpireTime);
                // Calculate the duration until token expiration
                const duration = expireTime.diff(currentTime);
                // Store the reference to "this" for later use inside setTimeout
                const self = this;
                // Set the timeout to call a function after the duration
                setTimeout(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // Call your function here
                        yield self.getToken(credentials[credentialsIndex].client_id, credentials[credentialsIndex].client_secret);
                    });
                }, duration);
                const jobData = {
                    client_id: credentials[credentialsIndex].client_id,
                    client_secret: credentials[credentialsIndex].client_secret,
                    schema_name: credentials[credentialsIndex].schema_name,
                    store_id: credentials[credentialsIndex].store_id,
                    user_setting_id: credentials[credentialsIndex].user_setting_id,
                };
                yield queueService_1.wallmartQueue.add('getPLulfilledOrder', jobData);
            }
            return { data: data };
        });
    }
    getUserCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const userSettingData = [];
            const usersSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const getCredentials = yield usersSettingRepository
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
        });
    }
    getUserCredentialsNew() {
        return __awaiter(this, void 0, void 0, function* () {
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const userSettingData = yield storeConfigRepository
                .createQueryBuilder('store_config')
                .leftJoinAndSelect('users_settings', 'user_settings', 'user_settings.store_id=store_config.id')
                .where('user_settings.is_connected = :connected', {
                connected: true,
            })
                .andWhere('store_config.is_deleted = :deleted', { deleted: false })
                .getRawMany();
            return userSettingData;
        });
    }
    updateOrdersAndOrderCharges() {
        return __awaiter(this, void 0, void 0, function* () {
            const ordersRepository = (yield this.connection('default_233')).getRepository(Index_1.Orders);
            const ordersChargesRepository = (yield this.connection('default_233')).getRepository(Index_1.OrderCharges);
            const orders = yield ordersRepository.find();
            orders.map((order) => __awaiter(this, void 0, void 0, function* () {
                const orderLines = order.order_lines.orderLine;
                const orderId = order.id;
                orderLines.map((orderLine) => __awaiter(this, void 0, void 0, function* () {
                    const chargeType = orderLine['charges']['charge'][0]['chargeType'];
                    yield ordersChargesRepository.update({ order_id: orderId }, { charge_type: chargeType });
                }));
            }));
            return { message: 'hello world' };
        });
    }
    return() {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = yield this.getUserCredentials();
            let data;
            for (let credentialsIndex = 0; credentialsIndex < credentials.length; credentialsIndex++) {
                const wallmart = new ReturnsController_1.ReturnsController();
                wallmart.clientId = credentials[credentialsIndex].client_id;
                wallmart.clientSecret = credentials[credentialsIndex].client_secret;
                wallmart.schema_name = credentials[credentialsIndex].schema_name;
                wallmart.store_id = credentials[credentialsIndex].store_id;
                wallmart.user_setting_id =
                    credentials[credentialsIndex].user_setting_id;
                data = yield wallmart.returnWallmartData();
            }
            return { data: data };
        });
    }
    getItemReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const userSettings = yield this.getUserCredentials();
            for (const credential of userSettings) {
                this.clientId = null;
                this.clientSecret = null;
                this.accessToken = null;
                this.clientId = credential.client_id;
                this.clientSecret = credential.client_secret;
                const requestReportData = yield this.onRequestReport('ITEM', 'READY');
                // console.log(requestReportData.requests);
                const requestID = requestReportData.requests[0].requestId;
                const downloadDetails = yield this.downloadRequestReport(requestID);
                const jobData = {
                    requestURL: downloadDetails.downloadURL,
                    store_id: credential.store_id,
                    schema_name: credential.schema_name,
                    user_id: credential.user_id,
                };
                queueService_1.wallmartQueue.add('download-item-report', jobData);
            }
            return { message: 'Product Image' };
        });
    }
    getAvailReconReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const userSettings = yield this.getUserCredentials();
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
                    queueService_1.reconQueue.add('recon-available-date', reconAvailableDateJobData);
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
            }
            catch (error) {
                logger_1.default.info(`getAvailReconReport function catch block ${error}`);
            }
            return {};
        });
    }
    getGetAvailReconReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const reconManageRepository = (yield this.publicConnection()).getRepository(Index_1.ReconManagement);
            const getAllNotDownloadedFiles = yield reconManageRepository
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
                queueService_1.reconQueue.add('download-recon-file', jobData);
            }
            return {};
        });
    }
    readReconReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const reconManageRepository = (yield this.publicConnection()).getRepository(Index_1.ReconManagement);
            const getAllUnreadFiles = yield reconManageRepository
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
                queueService_1.reconQueue.add('read-recon-file', jobData);
            }
            return {};
        });
    }
    checkUserOrderMonthly() {
        return __awaiter(this, void 0, void 0, function* () {
            const getCurrentDate = (0, moment_1.default)();
            const monthEndDate = getCurrentDate.subtract(1, 'day');
            const startDate = monthEndDate.startOf('month').format('YYYY-MM-DD');
            const endDate = monthEndDate.endOf('month').format('YYYY-MM-DD');
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const connection = yield this.publicConnection();
            const entityManager = connection.manager;
            const userData = yield usersRepository
                .createQueryBuilder('user')
                .select('user.store_name', 'store_name')
                .addSelect('stripe_plan.no_of_orders', 'no_of_orders')
                .leftJoin('stripe_subscriptions', 'stripe_sub', 'stripe_sub.stripe_customer_id = user.stripe_customer_id')
                .leftJoin('stripe_plans', 'stripe_plan', 'stripe_plan.stripe_price_id = stripe_sub.stripe_price_id')
                .andWhere('user.is_deleted = :is_deleted', { is_deleted: false })
                .andWhere('user.store_name != :store_name', {
                store_name: (0, typeorm_1.IsNull)(),
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
                const checkSchemaExist = yield checkSchemaExistQuery.getRawMany();
                if (checkSchemaExist.length > 0) {
                    const ordersRepository = (yield this.connection(schema_name)).getRepository(Index_1.Orders);
                    logger_1.default.info(`IN Cron JOB Function name checkUserOrderMonthly Schema ${schema_name} exists.`);
                    const orders = yield ordersRepository
                        .createQueryBuilder('order')
                        .select('id')
                        .where('order.formated_date BETWEEN :startDate AND :endDate', {
                        startDate: startDate,
                        endDate: endDate,
                    })
                        .getCount();
                    // orderArray.push({
                    //     store_name: schema_name,
                    //     orderSize: orders.length,
                    //     startDate: startDate,
                    //     endDate: endDate,
                    // })
                    if (orders >= no_of_orders) {
                        yield usersRepository.update({ store_name: schema_name }, { upgrade_required: true });
                    }
                }
                else {
                    logger_1.default.info(`IN Cron JOB Function name checkUserOrderMonthly Schema ${schema_name} does not exist.`);
                }
            }
            // return orderArray
            return {};
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/get-wfs-order'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getWFSOrdersFromWallMart", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-seller-order'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getSellerOrdersFromWallMart", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-plfulfilled-order'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getPLFulfilledOrdersFromWallMart", null);
__decorate([
    (0, routing_controllers_1.Get)('/update-orders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "updateOrdersAndOrderCharges", null);
__decorate([
    (0, routing_controllers_1.Get)('/return'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "return", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-item-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getItemReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/available-recon-date'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getAvailReconReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-available-recon-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "getGetAvailReconReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/read-recon-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "readReconReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/check-user-order-monthly'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobs.prototype, "checkUserOrderMonthly", null);
CronJobs = __decorate([
    (0, routing_controllers_1.JsonController)('/cron-jobs')
], CronJobs);
exports.CronJobs = CronJobs;
//# sourceMappingURL=CronJobsController.js.map