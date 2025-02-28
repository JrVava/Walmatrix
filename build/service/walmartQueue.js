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
exports.recon = exports.wallmartQueues = void 0;
const bullmq_1 = require("bullmq");
const RedisClient_1 = __importDefault(require("../modules/RedisClient"));
const WalmartService_1 = require("./WalmartService");
exports.wallmartQueues = new bullmq_1.Queue('wallmartQueues', {
    connection: RedisClient_1.default.duplicate(),
});
exports.recon = new bullmq_1.Worker('wallmartQueues', (job) => __awaiter(void 0, void 0, void 0, function* () {
    // Define your processing logic for 'recon' queue here
    const callingWalartService = new WalmartService_1.WalmartService();
    switch (job.name) {
        case 'get-recon-dates':
            callingWalartService.getReconDates(job.data);
            break;
        case 'save-recon-dates':
            callingWalartService.saveReconDates(job.data);
            break;
        case 'download-recon-file':
            callingWalartService.downloadReconFile(job.data);
            break;
        case 'read-recon-file-csv':
            callingWalartService.readReconCsvData(job.data);
            break;
        case 'save-recon-file-csv':
            callingWalartService.saveReconData(job.data);
            break;
    }
    return { message: 'hello' };
}), { connection: RedisClient_1.default });
//# sourceMappingURL=walmartQueue.js.map