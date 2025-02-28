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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Products = void 0;
const moment_1 = __importDefault(require("moment"));
const typeorm_1 = require("typeorm");
let Products = class Products {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Products.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "product_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "lifecycle_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "publish_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "status_change_reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "product_category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "buy_box_item_price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "buy_box_shipping_price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "msrp", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "product_tax_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "ship_methods", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "shipping_weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "shipping_weight_unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "fulfillment_lag_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "fulfillment_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "wfs_sales_restriction", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "wpid", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "gtin", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "upc", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "item_page_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "primary_image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "shelf_name", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", String)
], Products.prototype, "primary_category_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "offer_start_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "offer_end_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "item_creation_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "item_last_updated", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "reviews_count", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "average_rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "searchable", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "variant_group_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "primary_variant", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "variant_grouping_attributes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "variant_grouping_values", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "competitor_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "competitor_price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    }),
    __metadata("design:type", Number)
], Products.prototype, "competitor_ship_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "competitor_last_date_fetched", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "repricer_strategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "minimum_seller_allowed_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "maximum_seller_allowed_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Products.prototype, "repricer_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Products.prototype, "store_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        transformer: {
            to: () => moment_1.default.utc().format(),
            from: (value) => value,
        },
    }),
    __metadata("design:type", String)
], Products.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Products.prototype, "updated_at", void 0);
Products = __decorate([
    (0, typeorm_1.Entity)()
], Products);
exports.Products = Products;
//# sourceMappingURL=Products.js.map