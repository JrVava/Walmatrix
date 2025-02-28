"use strict";
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
exports.findSchemaNameWithArray = void 0;
const Index_1 = require("../entity/Index");
const connection_1 = require("../connection");
function findSchemaNameWithArray(store_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = new connection_1.DataSourceConnection();
        const storeRepository = (yield connection.publicConnection()).getRepository(Index_1.StoreConfig);
        const getStoreData = yield storeRepository
            .createQueryBuilder('store')
            .select('store.user_id', 'user_id')
            .addSelect('id', 'id')
            .where('store.id IN (:...store_id)', { store_id: store_id })
            .andWhere('store.is_active = :is_active', { is_active: true })
            .andWhere('store.is_deleted != :is_deleted', { is_deleted: true })
            .getRawOne();
        (yield connection.publicConnection()).destroy();
        return { schemaName: `default_${getStoreData.user_id}` };
    });
}
exports.findSchemaNameWithArray = findSchemaNameWithArray;
//# sourceMappingURL=helper.js.map