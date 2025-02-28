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
exports.AdsService = void 0;
const axios_1 = __importDefault(require("axios"));
const awsService_1 = require("./awsService");
const path_1 = __importDefault(require("path"));
const AdvertiseClient_1 = require("../modules/AdvertiseClient");
const Index_1 = require("../entity/Index");
const AdsQueue_1 = require("./AdsQueue");
const logger_1 = __importDefault(require("./logger"));
class AdsService extends AdvertiseClient_1.AdvertiseClient {
    getAdsCSV(data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const adsReportManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdsReportManagement);
            const reportResponse = yield axios_1.default.get(data.reportLink, {
                responseType: 'arraybuffer',
            });
            const s3Client = new awsService_1.AwsService();
            const fileName = `${path_1.default.basename(data.reportLink)}.csv`;
            try {
                const fileUploaded = yield s3Client.uploadBuferToS3(`${data.downloadPath}/${fileName}`, reportResponse.data);
                if (fileUploaded &&
                    ((_b = (_a = fileUploaded.result) === null || _a === void 0 ? void 0 : _a.$metadata) === null || _b === void 0 ? void 0 : _b.httpStatusCode) == 200) {
                    const snapshotResultData = {
                        id: data.advertise_id,
                        job_status: 'ready',
                    };
                    yield adsReportManagementRepository.save(snapshotResultData);
                }
            }
            catch (error) {
                logger_1.default.error('HERE IS ERROR IN UPLOAD S3 PPC REPORT', error);
            }
        });
    }
    getReportStatus(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.snapshot_id && data.advertise_id) {
                const adsReportManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdsReportManagement);
                const getReportDetails = yield this.getSnapshotReports(data.advertise_id, data.snapshot_id);
                const snapshotResultData = {
                    id: data.ads_manage_id,
                    job_status: getReportDetails.jobStatus,
                    report_link: getReportDetails.details,
                };
                //save api reponse
                yield adsReportManagementRepository.save(snapshotResultData);
                const getAdsReportCsvJobData = {
                    reportLink: getReportDetails.details,
                    downloadPath: data.download_path,
                    advertise_id: data.ads_manage_id,
                };
                yield AdsQueue_1.adsQueue.add('get-ads-report-csv', getAdsReportCsvJobData, {
                    removeDependencyOnFailure: true,
                });
            }
        });
    }
}
exports.AdsService = AdsService;
//# sourceMappingURL=adsService.js.map