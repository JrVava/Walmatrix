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
exports.Advertisers = void 0;
const typeorm_1 = require("typeorm");
let Advertisers = class Advertisers {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Advertisers.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "campaign_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "campaign_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "ad_group_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "ad_group_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "item_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: { to: (value) => parseInt(value), from: (value) => value },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "search_keyword", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "bidded_keyword", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Advertisers.prototype, "match_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "impressions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "clicks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "ctr", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "ad_spend", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "conversion_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "orders", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "conversion_rate_order_based", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "total_attributed_sales", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "advertised_sku_sales", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "other_sku_sales", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "units_sold", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "advertise_sku_units", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "other_sku_units", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Advertisers.prototype, "roas", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Advertisers.prototype, "store_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Advertisers.prototype, "advertiser_report_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], Advertisers.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", String)
], Advertisers.prototype, "updated_at", void 0);
Advertisers = __decorate([
    (0, typeorm_1.Entity)()
], Advertisers);
exports.Advertisers = Advertisers;
//# sourceMappingURL=Advertisers.js.map