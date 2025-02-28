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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalmartController = void 0;
const routing_controllers_1 = require("routing-controllers");
const walmartQueue_1 = require("../service/walmartQueue");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
let WalmartController = class WalmartController extends connection_1.DataSourceConnection {
    getReconAvailaleDates() {
        return __awaiter(this, void 0, void 0, function* () {
            const getUserDetails = yield this.getUserDetails();
            // console.log("getUserDetails", getUserDetails);
            // return {}
            if (getUserDetails.length > 0) {
                for (const setting of getUserDetails) {
                    const data = {
                        user_setting_id: setting.user_setting_id,
                        user_id: setting.user_id,
                        store_name: setting.store_name,
                        store_id: setting.store_id,
                        client_id: setting.client_id,
                        client_secret: setting.client_secret,
                    };
                    walmartQueue_1.wallmartQueues.add('get-recon-dates', data);
                }
            }
            return {};
        });
    }
    getUserDetails() {
        return __awaiter(this, void 0, void 0, function* () {
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
                .andWhere('us.user_id in (:...user_id)', { user_id: [11, 3] })
                .getRawMany();
            (yield this.publicConnection()).destroy();
            return getCredentials;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/get-recon-available-dates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WalmartController.prototype, "getReconAvailaleDates", null);
WalmartController = __decorate([
    (0, routing_controllers_1.JsonController)('/wallmart')
], WalmartController);
exports.WalmartController = WalmartController;
//# sourceMappingURL=WalmartController.js.map