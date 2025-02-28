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
exports.ReconManagement = void 0;
const typeorm_1 = require("typeorm");
const Index_1 = require("./Index");
let ReconManagement = class ReconManagement {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReconManagement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ReconManagement.prototype, "available_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ReconManagement.prototype, "is_file_downloaded", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ReconManagement.prototype, "is_deleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ReconManagement.prototype, "user_setting_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Boolean)
], ReconManagement.prototype, "is_file_read", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Index_1.UsersSettings, (userSetting) => userSetting.advertise_id),
    (0, typeorm_1.JoinColumn)({ name: 'user_setting_id' }),
    __metadata("design:type", Index_1.UsersSettings)
], ReconManagement.prototype, "userSetting", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], ReconManagement.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], ReconManagement.prototype, "updated_at", void 0);
ReconManagement = __decorate([
    (0, typeorm_1.Entity)()
], ReconManagement);
exports.ReconManagement = ReconManagement;
//# sourceMappingURL=ReconManagement.js.map