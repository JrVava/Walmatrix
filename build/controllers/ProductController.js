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
exports.ProductController = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
let ProductController = class ProductController extends connection_1.DataSourceConnection {
    getProducts_old(page, limit, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const email = String(req.header('email'));
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUserData = yield usersRepository.findOne({
                where: {
                    email: email,
                },
            });
            const productsRepository = (yield this.connection(getUserData.store_name)).getRepository(Index_1.Products);
            const [products, total] = yield productsRepository.findAndCount({
                skip: (page - 1) * limit,
                take: limit,
            });
            return {
                page,
                limit,
                total,
                data: products,
            };
        });
    }
    getProducts(search, name, direction, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log("search", search);
            // console.log("name", name);
            // console.log("direction", typeof direction);
            // return {}
            const email = String(req.header('email'));
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUserData = yield usersRepository.findOne({
                where: {
                    email: email,
                },
            });
            const productsRepository = (yield this.connection(getUserData.store_name)).getRepository(Index_1.Products);
            // const product = await productsRepository
            //     .createQueryBuilder('product')
            //     .select('product.*')
            //     .addSelect('cogs.id', 'cogs_id')
            //     .addSelect('cogs.amount', 'cogs_amount')
            //     .addSelect('cogs.start', 'cogs_start_date')
            //     .addSelect('cogs.end', 'cogs_end_date')
            //     .leftJoin('cogs', 'cogs', 'cogs.product_id = product.id')
            //     .getRawMany();
            const queryBuilder = productsRepository
                .createQueryBuilder('product')
                .select('product.*')
                .addSelect('cogs.id', 'cogs_id')
                .addSelect('cogs.amount', 'cogs_amount')
                .addSelect('cogs.start', 'cogs_start_date')
                .addSelect('cogs.end', 'cogs_end_date')
                .leftJoin('cogs', 'cogs', 'cogs.product_id = product.id');
            if (search) {
                queryBuilder.where('(product.product_name LIKE :search OR sku::text LIKE :search OR gtin::text LIKE :search OR item_id::text LIKE :search)', { search: `%${search}%` });
            }
            if (name && direction) {
                queryBuilder.orderBy(name, direction);
            }
            const product = yield queryBuilder.getRawMany();
            if (product) {
                (yield this.publicConnection()).destroy();
                (yield this.connection(getUserData.store_name)).destroy();
                return res
                    .status(200)
                    .send({ data: product, message: 'Products found' });
            }
            else {
                return res.status(404).send({ message: 'Products does not found' });
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/old'),
    __param(0, (0, routing_controllers_1.QueryParam)('page')),
    __param(1, (0, routing_controllers_1.QueryParam)('limit')),
    __param(2, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getProducts_old", null);
__decorate([
    (0, routing_controllers_1.Get)('/'),
    __param(0, (0, routing_controllers_1.QueryParam)('search')),
    __param(1, (0, routing_controllers_1.QueryParam)('name')),
    __param(2, (0, routing_controllers_1.QueryParam)('direction')),
    __param(3, (0, routing_controllers_1.Req)()),
    __param(4, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getProducts", null);
ProductController = __decorate([
    (0, routing_controllers_1.JsonController)('/products'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], ProductController);
exports.ProductController = ProductController;
//# sourceMappingURL=ProductController.js.map