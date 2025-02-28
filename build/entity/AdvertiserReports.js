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
exports.AdvertiserReports = void 0;
const typeorm_1 = require("typeorm");
let AdvertiserReports = class AdvertiserReports {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AdvertiserReports.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "uid", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "url_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "report_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "attribution_window", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "group_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "requested_data", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "report_start_date", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "report_end_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "csv_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], AdvertiserReports.prototype, "store_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "downloaded_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "s3_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], AdvertiserReports.prototype, "updated_at", void 0);
AdvertiserReports = __decorate([
    (0, typeorm_1.Entity)()
], AdvertiserReports);
exports.AdvertiserReports = AdvertiserReports;
//# sourceMappingURL=AdvertiserReports.js.map