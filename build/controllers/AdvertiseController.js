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
exports.AdvertiseController = void 0;
const routing_controllers_1 = require("routing-controllers");
const Index_1 = require("../entity/Index");
const AdvertiseClient_1 = require("../modules/AdvertiseClient");
const utils_1 = require("../modules/utils");
const moment_1 = __importDefault(require("moment"));
const AdsQueue_1 = require("../service/AdsQueue");
let AdvertiseController = class AdvertiseController extends AdvertiseClient_1.AdvertiseClient {
    constructor() {
        super();
    }
    createSnapshopReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const getStoreDetails = yield this.getUserCredentialsNew();
            const adsReportManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdsReportManagement);
            getStoreDetails.forEach((element) => __awaiter(this, void 0, void 0, function* () {
                const adId = element.advertiser_id;
                const dateBatch = (0, utils_1.getDateBatch)(element.sync_date);
                dateBatch.forEach((date) => __awaiter(this, void 0, void 0, function* () {
                    const startDate = (0, moment_1.default)(date.startDate).format('YYYY-MM-DD');
                    const endDate = (0, moment_1.default)(date.endDate).format('YYYY-MM-DD');
                    this.requestData = {
                        advertiserId: adId,
                        startDate: startDate,
                        endDate: endDate,
                        reportType: 'adItem',
                        reportMetrics: [
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
                        ],
                    };
                    const returnResult = yield this.generateSnapshotReport();
                    const snapshotResultData = {
                        advertise_id: element.advertiser_id,
                        snapshot_id: returnResult.snapshotId,
                        job_status: returnResult.jobStatus,
                        start_date: startDate,
                        end_date: endDate,
                        report_type: 'adItem',
                        user_setting_id: element.user_setting_id,
                    };
                    //save api reponse
                    yield adsReportManagementRepository.save(snapshotResultData);
                }));
            }));
            return getStoreDetails;
        });
    }
    getSnapshopReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const adsReportManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdsReportManagement);
            const getAllPendingFiles = yield adsReportManagementRepository
                .createQueryBuilder('ads_manage')
                .leftJoinAndSelect('users_settings', 'user_settings', 'user_settings.id=ads_manage.user_setting_id')
                .leftJoin('advertiser_management', 'advertiser_management', 'advertiser_management.user_setting_id=user_settings.id')
                .leftJoinAndSelect('store_config', 'sc', 'sc.id=user_settings.store_id')
                .where('ads_manage.advertise_id = :adId', { adId: 212651 })
                // .where('ads_manage.is_deleted = :is_deleted',{is_deleted:false})
                // .andWhere('ads_manage.job_status = :job_status',{job_status:'pending'})
                // .andWhere('sc.is_deleted = :deleted', { deleted: false })
                .getRawMany();
            getAllPendingFiles.forEach((element) => __awaiter(this, void 0, void 0, function* () {
                const downloadPath = `${element.user_settings_store_id}/${element.user_settings_user_id}/adsreport/${element.ads_manage_advertise_id}`;
                const adsReportStatus = {
                    advertise_id: element.ads_manage_advertise_id,
                    snapshot_id: element.ads_manage_snapshot_id,
                    ads_manage_id: element.ads_manage_id,
                    download_path: downloadPath,
                };
                AdsQueue_1.adsQueue.add('ads-report-status', adsReportStatus, {
                    removeDependencyOnFailure: true,
                });
            }));
            return {};
        });
    }
    getUserCredentialsNew() {
        return __awaiter(this, void 0, void 0, function* () {
            const AdvertiserManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserManagement);
            const userSettingData = yield AdvertiserManagementRepository.createQueryBuilder('advertiser_management')
                .leftJoin('users_settings', 'user_settings', 'user_settings.id=advertiser_management.user_setting_id')
                .leftJoinAndSelect('store_config', 'sc', 'sc.id=user_settings.store_id')
                .where('advertiser_management.advertiser_id = :adId', {
                adId: 212651,
            })
                // .andWhere('sc.is_deleted = :deleted', { deleted: false })
                .andWhere('advertiser_management.is_verify = :is_verify', {
                is_verify: true,
            })
                .getMany();
            return userSettingData;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/create-snapshot-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdvertiseController.prototype, "createSnapshopReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-snapshot-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdvertiseController.prototype, "getSnapshopReport", null);
AdvertiseController = __decorate([
    (0, routing_controllers_1.JsonController)('/advertise'),
    __metadata("design:paramtypes", [])
], AdvertiseController);
exports.AdvertiseController = AdvertiseController;
//# sourceMappingURL=AdvertiseController.js.map