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
exports.StoreConfig = void 0;
const typeorm_1 = require("typeorm");
const Index_1 = require("./Index");
let StoreConfig = class StoreConfig {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StoreConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], StoreConfig.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StoreConfig.prototype, "store_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Boolean)
], StoreConfig.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], StoreConfig.prototype, "is_deleted", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Index_1.UsersSettings, (userSetting) => userSetting.stores),
    __metadata("design:type", Index_1.UsersSettings)
], StoreConfig.prototype, "userSetting", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StoreConfig.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], StoreConfig.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], StoreConfig.prototype, "updated_at", void 0);
StoreConfig = __decorate([
    (0, typeorm_1.Entity)()
], StoreConfig);
exports.StoreConfig = StoreConfig;
//# sourceMappingURL=StoreConfig.js.map