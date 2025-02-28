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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adsWorker = exports.adsQueue = void 0;
const bullmq_1 = require("bullmq");
const RedisClient_1 = __importDefault(require("../modules/RedisClient"));
const adsService_1 = require("./adsService");
exports.adsQueue = new bullmq_1.Queue('advertise-api', {
    connection: RedisClient_1.default.duplicate(),
});
exports.adsWorker = new bullmq_1.Worker('advertise-api', (job) => __awaiter(void 0, void 0, void 0, function* () {
    const adsService = new adsService_1.AdsService();
    switch (job.name) {
        case 'get-ads-report-csv':
            adsService.getAdsCSV(job.data);
            break;
        case 'ads-report-status':
            yield adsService.getReportStatus(job.data);
            break;
        default:
            break;
    }
    return 'Success';
}), { connection: RedisClient_1.default });
//# sourceMappingURL=AdsQueue.js.map