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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSettings = void 0;
const typeorm_1 = require("typeorm");
const Index_1 = require("./Index");
let UsersSettings = class UsersSettings {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UsersSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "client_secret", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "access_token", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "expire_at", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.OneToOne)(() => Index_1.Users, (users) => users.id),
    (0, typeorm_1.JoinColumn)({ name: 'id' }),
    __metadata("design:type", Number)
], UsersSettings.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], UsersSettings.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Index_1.Users, (user) => user.usersSettings),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Index_1.Users)
], UsersSettings.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], UsersSettings.prototype, "is_connected", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], UsersSettings.prototype, "store_id", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Array)
], UsersSettings.prototype, "adversiter_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "sync_date", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "order_wfs_sync_date", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "order_seller_sync_date", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { nullable: true }),
    __metadata("design:type", String)
], UsersSettings.prototype, "order_plfulfilled_sync_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], UsersSettings.prototype, "recon_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], UsersSettings.prototype, "return_sync_date", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Index_1.AdvertiserManagement, (advertise) => advertise.userSetting),
    __metadata("design:type", Array)
], UsersSettings.prototype, "advertise_id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Index_1.ReconManagement, (recon) => recon.userSetting),
    __metadata("design:type", Array)
], UsersSettings.prototype, "recon_manage", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Index_1.StoreConfig, (store) => store.userSetting),
    (0, typeorm_1.JoinColumn)({ name: 'store_id' }),
    __metadata("design:type", Index_1.StoreConfig)
], UsersSettings.prototype, "stores", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], UsersSettings.prototype, "updated_at", void 0);
UsersSettings = __decorate([
    (0, typeorm_1.Entity)()
], UsersSettings);
exports.UsersSettings = UsersSettings;
//# sourceMappingURL=UsersSettings.js.map