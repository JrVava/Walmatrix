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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cogs = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const csv_parser_1 = __importDefault(require("csv-parser"));
let Cogs = class Cogs extends connection_1.DataSourceConnection {
    storeCogs(cogsData, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const store_id = cogsData['store_id'];
            const { id, amount, product_id, start, end } = cogsData;
            let cogsId = id;
            if (store_id) {
                const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
                const getStore = yield storeConfigRepository.findOne({
                    where: { id: store_id },
                });
                if (getStore) {
                    const schema_name = `default_${getStore.user_id}`;
                    const productRepository = (yield this.connection(schema_name)).getRepository(Index_1.Products);
                    const cogsRepository = (yield this.connection(schema_name)).getRepository(Index_1.CogsEntity);
                    const checkProductExist = yield productRepository.findOne({
                        where: { id: product_id },
                    });
                    if (checkProductExist) {
                        if (id) {
                            yield cogsRepository.update({ id: cogsId }, {
                                amount: amount,
                                product_id: product_id,
                                start: start,
                                end: end,
                            });
                        }
                        else {
                            const cogsSaveData = yield cogsRepository.save({
                                amount: amount,
                                product_id: product_id,
                                start: start,
                                end: end,
                            });
                            cogsId = cogsSaveData.id;
                        }
                        const cogs = yield cogsRepository.findOne({
                            where: { id: cogsId },
                        });
                        return res.status(200).send({
                            message: 'Cogs saved successfully.',
                            data: cogs,
                        });
                    }
                    else {
                        return res
                            .status(404)
                            .send({ message: 'Sorry, Product does not exist.' });
                    }
                }
                else {
                    return res
                        .status(404)
                        .send({ message: 'Sorry, Store not found.' });
                }
            }
            else {
                return res
                    .status(404)
                    .send({ message: 'Sorry, Store Id is requird.' });
            }
        });
    }
    cogCSVUpload(file, res, dataObj) {
        return __awaiter(this, void 0, void 0, function* () {
            const store_id = dataObj.store_id;
            if (store_id) {
                const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
                const getStore = yield storeConfigRepository.findOne({
                    where: { id: store_id },
                });
                const schema_name = `default_${getStore.user_id}`;
                const cogsRepository = (yield this.connection(schema_name)).getRepository(Index_1.CogsEntity);
                try {
                    if (!file || !file.buffer) {
                        return res
                            .status(404)
                            .send({ message: 'Sorry, No file uploaded.' });
                    }
                    const data = [];
                    const fileBuffer = file.buffer.toString();
                    // Parse CSV data from the file buffer
                    (0, csv_parser_1.default)({ separator: ',' })
                        .on('data', (row) => {
                        data.push(row);
                    })
                        .write(fileBuffer);
                    // console.log("data", data);
                    data.map((cogs) => __awaiter(this, void 0, void 0, function* () {
                        const productId = yield this.getProductID(cogs['SKU'], cogs['Item Id'], store_id, schema_name);
                        const checkCogs = yield cogsRepository.findOne({
                            where: { product_id: productId },
                        });
                        const cogsData = {
                            amount: cogs['CoGs'],
                            product_id: productId,
                        };
                        if (checkCogs) {
                            cogsData['id'] = checkCogs.id;
                        }
                        yield cogsRepository.save(cogsData);
                    }));
                    return res
                        .status(200)
                        .send({ message: "COG's CSV data uploaded successfully." });
                }
                catch (error) {
                    return res
                        .status(500)
                        .send({ message: 'Internal Server Error' });
                }
            }
            else {
                return res
                    .status(404)
                    .send({ message: 'Sorry, Store Id is requird.' });
            }
        });
    }
    getProductID(sku, item_id, store_id, schema_name) {
        return __awaiter(this, void 0, void 0, function* () {
            const productRepository = (yield this.connection(schema_name)).getRepository(Index_1.Products);
            const getProduct = yield productRepository.findOne({
                where: {
                    item_id: +item_id,
                    sku: sku,
                    store_id: +store_id,
                },
            });
            yield (yield this.connection(schema_name)).destroy();
            return getProduct ? getProduct.id : null;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)('/store'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Cogs.prototype, "storeCogs", null);
__decorate([
    (0, routing_controllers_1.Post)('/csv-upload'),
    __param(0, (0, routing_controllers_1.UploadedFile)('file')),
    __param(1, (0, routing_controllers_1.Res)()),
    __param(2, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], Cogs.prototype, "cogCSVUpload", null);
Cogs = __decorate([
    (0, routing_controllers_1.JsonController)('/cogs'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], Cogs);
exports.Cogs = Cogs;
//# sourceMappingURL=CogsManagement.js.map