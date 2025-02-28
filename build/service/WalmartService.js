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
exports.WalmartService = void 0;
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const WallmartClients_1 = require("../modules/WallmartClients");
const awsService_1 = require("./awsService");
const unzipper_1 = __importDefault(require("unzipper"));
const walmartQueue_1 = require("./walmartQueue");
const moment_1 = __importDefault(require("moment"));
const utils_1 = require("../modules/utils");
const logger_1 = __importDefault(require("./logger"));
class WalmartService extends connection_1.DataSourceConnection {
    constructor() {
        super();
        this.walmartClient = new WallmartClients_1.WallmartClients();
        // Initialize the service
    }
    static getInstance() {
        if (!WalmartService.instance) {
            WalmartService.instance = new WalmartService();
        }
        return WalmartService.instance;
    }
    getReconDates(data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.walmartClient.accessToken = null;
            this.walmartClient.clientId = null;
            this.walmartClient.clientSecret = null;
            // Passing the clientId and clientSecret
            this.walmartClient.clientId = data.client_id;
            this.walmartClient.clientSecret = data.client_secret;
            const reconDates = yield this.walmartClient.availableReconFiles();
            const reconDatesObj = {
                user_setting_id: data.user_setting_id,
                user_id: data.user_id,
                store_name: data.store_name,
                client_id: data.client_id,
                client_secret: data.client_secret,
                store_id: data.store_id,
                datesArray: reconDates.availableApReportDates,
            };
            logger_1.default.info('Getting Available Date From WallMart');
            walmartQueue_1.wallmartQueues.add('save-recon-dates', reconDatesObj);
        });
    }
    saveReconDates(data) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('Saving Available Date Into Database');
            const reconManageRepository = (yield this.publicConnection()).getRepository(Index_1.ReconManagement);
            for (const date of data.datesArray) {
                const reconManageData = {
                    id: null,
                    user_setting_id: data.user_setting_id,
                    available_date: date,
                };
                const checkDataExist = yield reconManageRepository.findOne({
                    where: {
                        user_setting_id: data.user_setting_id,
                        available_date: date,
                    },
                });
                if (checkDataExist) {
                    reconManageData.id = checkDataExist.id;
                }
                const saveReconDate = yield reconManageRepository.save(reconManageData);
                (yield this.publicConnection()).destroy();
                const reconDownloadFileRelatedObj = {
                    client_id: data.client_id,
                    client_secret: data.client_secret,
                    user_id: data.user_id,
                    user_setting_id: data.user_setting_id,
                    store_id: data.store_id,
                    available_date: date,
                    recon_management_id: saveReconDate.id,
                };
                walmartQueue_1.wallmartQueues.add('download-recon-file', reconDownloadFileRelatedObj);
            }
        });
    }
    downloadReconFile(data) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('Downloading Recon Available Date Files');
            this.walmartClient.accessToken = null;
            this.walmartClient.clientId = null;
            this.walmartClient.clientSecret = null;
            // Passing the clientId and clientSecret
            this.walmartClient.clientId = data.client_id;
            this.walmartClient.clientSecret = data.client_secret;
            yield this.walmartClient.getReconReportCSV(data.available_date, data.store_id, data.user_id, data.recon_management_id);
            const s3FilePath = `${data.store_id}/${data.user_id}/recon/file_${data.available_date}-${data.store_id}.zip`;
            const reconDownloadFileRelatedObj = {
                user_id: data.user_id,
                file_path: s3FilePath,
                store_id: data.store_id,
                file_id: data.recon_management_id,
                available_date: data.available_date,
            };
            walmartQueue_1.wallmartQueues.add('read-recon-file-csv', reconDownloadFileRelatedObj);
        });
    }
    readReconCsvData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('READING CSV FILE OF Recon Available Date');
            const awsService = new awsService_1.AwsService();
            const s3Response = yield awsService.readCSV(data.file_path);
            // console.log('s3Response', s3Response);
            const bodyContents = s3Response.Body;
            const readStream = bodyContents.pipe(unzipper_1.default.Parse());
            readStream.on('entry', (entry) => __awaiter(this, void 0, void 0, function* () {
                const bodyContents = yield (0, utils_1.streamToString)(entry);
                const csvDatas = yield bodyContents;
                const saveObj = {
                    csvDatas: csvDatas,
                    user_id: data.user_id,
                    store_id: data.store_id,
                    file_id: data.file_id,
                    available_date: data.available_date,
                };
                walmartQueue_1.wallmartQueues.add('save-recon-file-csv', saveObj);
            }));
        });
    }
    saveReconData(fileDataObj) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('SAVING CSV FILE DATA of Recon Available Date into DATABASE');
            const reconRepository = (yield this.connection(`default_${fileDataObj.user_id}`)).getRepository(Index_1.Recon);
            const result = yield Promise.all(fileDataObj.csvDatas.map((data) => {
                return {
                    period_start_date: !data['Period Start Date']
                        ? null
                        : data['Period Start Date'],
                    period_end_date: !data['Period End Date']
                        ? null
                        : data['Period End Date'],
                    total_payable: data['Total Payable']
                        ? parseFloat(data['Total Payable'])
                        : 0,
                    currency: data['Currency'],
                    transaction_key: data['Transaction Key'],
                    transaction_posted_timestamp: !!data['Transaction Posted Timestamp']
                        ? (0, moment_1.default)(data['Transaction Posted Timestamp'], 'MM/DD/YYYY').format('YYYY-MM-DD')
                        : null,
                    transaction_type: data['Transaction Type'],
                    transaction_description: data['Transaction Description'],
                    customer_order: data['Customer Order #'],
                    customer_order_line: data['Customer Order line #']
                        ? parseFloat(data['Customer Order line #'])
                        : 0,
                    purchase_order: data['Purchase Order #'],
                    purchase_order_line: data['Purchase Order line #']
                        ? parseFloat(data['Purchase Order line #'])
                        : 0,
                    amount: data['Amount'] ? parseFloat(data['Amount']) : 0,
                    amount_type: data['Amount Type'],
                    ship_qty: data['Ship Qty']
                        ? parseFloat(data['Ship Qty'])
                        : 0,
                    commission_rate: data['Commission Rate']
                        ? parseFloat(data['Commission Rate'])
                        : 0,
                    transaction_reason_description: data['Transaction Reason Description'],
                    partner_item_id: data['Partner Item Id'],
                    partner_gtin: data['Partner GTIN']
                        ? parseInt(data['Partner GTIN']).toString()
                        : '',
                    partner_item_name: data['Partner Item Name'],
                    product_tax_code: data['Product Tax Code']
                        ? parseFloat(data['Product Tax Code'])
                        : 0,
                    ship_to_state: data['Ship to State'],
                    ship_to_city: data['Ship to City'],
                    ship_to_zipcode: data['Ship to Zipcode'],
                    contract_category: data['Contract Category'],
                    product_type: data['Product Type'],
                    commission_rule: data['Commission Rule'],
                    shipping_method: data['Shipping Method'],
                    fulfillment_type: data['Fulfillment Type'],
                    fulfillment_details: data['Fulfillment Details'],
                    original_commission: data['Original Commission']
                        ? parseFloat(data['Original Commission'])
                        : 0,
                    commission_incentive_program: data['Commission Incentive Program'],
                    commission_saving: data['Commission Saving']
                        ? parseFloat(data['Commission Saving'])
                        : 0,
                    customer_promo_type: data['Customer Promo Type'],
                    total_walmart_funded_savings_program: data['Total Walmart Funded Savings Program'],
                    campaign_id: data['Campaign Id'] === undefined
                        ? 0
                        : parseFloat(data['Campaign Id']),
                    store_id: fileDataObj.store_id,
                };
            }));
            yield reconRepository.save(result, { chunk: 100 });
            const reconManageRepository = (yield this.publicConnection()).getRepository(Index_1.ReconManagement);
            yield reconManageRepository.update({
                id: fileDataObj.file_id,
                available_date: fileDataObj.available_date,
            }, { is_file_read: true });
            (yield this.publicConnection()).destroy();
            (yield this.connection(`default_${fileDataObj.user_id}`)).destroy();
        });
    }
}
exports.WalmartService = WalmartService;
WalmartService.instance = null;
//# sourceMappingURL=WalmartService.js.map