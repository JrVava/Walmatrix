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
exports.WallmartClients = void 0;
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");
const config_1 = require("./../config");
const connection_1 = require("../connection");
const logger_1 = __importDefault(require("../service/logger"));
const ReconManagement_1 = require("../entity/ReconManagement");
const awsService_1 = require("../service/awsService");
class WallmartClients extends connection_1.DataSourceConnection {
    constructor() {
        super();
        this.headers = {};
        // private accessToken: string | null = null
        this.accessToken = null;
        this.clientId = null;
        this.clientSecret = null;
        this.getToken = (clientId, clientSecret) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                this.headers['Accept'] = 'application/json';
                // const response: AxiosResponse = await this.client.post('v3/token', { "grant_type": "client_credentials" }, { headers: this.headers, auth: { username: config.wallmart.clientId, password: config.wallmart.clientSecret } })
                const response = yield this.client.post('v3/token', { grant_type: 'client_credentials' }, {
                    headers: this.headers,
                    auth: { username: clientId, password: clientSecret },
                });
                const tokenResult = response.data;
                this.accessToken = tokenResult.access_token;
                // console.log({data : response.data,statusCode :response.status});
                return { data: response.data, statusCode: response.status };
            }
            catch (error) {
                if (error.response) {
                    // console.log("Error status code:", error.response.status);
                    // console.log("Error message:", error.response.data);
                    return {
                        statusCode: error.response.status,
                        message: error.response.data,
                    };
                }
                else {
                    return {
                        statusCode: 500,
                        message: 'Internal Server Error',
                    };
                }
            }
        });
        this.getItems = (page = 0) => __awaiter(this, void 0, void 0, function* () {
            this.headers['Content-Type'] = 'application/json';
            yield this.getToken(this.clientId, this.clientSecret);
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken });
            const itemURL = page != 0
                ? `v3/items?limit=200&offset=${page}`
                : `v3/items?limit=200`;
            const itemResponse = yield this.client.get(itemURL, {
                headers: this.headers,
            });
            return itemResponse.data;
        });
        this.getOrders = (createDate, shipNodeType, nextCursor) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.headers['Content-Type'] = 'application/json';
                if (this.accessToken === null) {
                    yield this.getToken(this.clientId, this.clientSecret);
                }
                // await this.getToken(); // Added await this.getToken for getting the token
                this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken });
                let apiUrl = 'v3/orders';
                if (createDate && shipNodeType) {
                    apiUrl += `?limit=200&createdStartDate=${createDate}&shipNodeType=${shipNodeType}`;
                }
                if (nextCursor) {
                    apiUrl += `${nextCursor}`;
                }
                const orderResponse = yield this.client.get(apiUrl, {
                    headers: this.headers,
                });
                // console.log('orderResponse:', orderResponse.data); // Add this line
                return orderResponse.data;
            }
            catch (err) {
                return err;
            }
        });
        this.getReconReportCSV = (date, store_id, user_id, file_id) => __awaiter(this, void 0, void 0, function* () {
            yield this.getToken(this.clientId, this.clientSecret);
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken, Accept: 'application/octet-stream', 'Content-Type': 'application/zip' });
            const apiResponse = yield this.client.get(`v3/report/reconreport/reconFile?reportDate=${date}&reportVersion=v1`, { headers: this.headers, responseType: 'arraybuffer' });
            const s3Client = new awsService_1.AwsService();
            const fileName = `file_${date}-${store_id}.zip`;
            s3Client.uploadBuferToS3(`${store_id}/${user_id}/recon/${fileName}`, apiResponse.data);
            const reconManageRepository = (yield this.publicConnection()).getRepository(ReconManagement_1.ReconManagement);
            yield reconManageRepository.update({ id: file_id, available_date: date }, { is_file_downloaded: true });
            (yield this.publicConnection()).destroy();
            return { status: 200 };
        });
        this.getReturn = (startDate, endDate, nextCursor) => __awaiter(this, void 0, void 0, function* () {
            this.headers['Content-Type'] = 'application/json';
            if (this.accessToken === null) {
                yield this.getToken(this.clientId, this.clientSecret);
            }
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken });
            let apiUrl = 'v3/returns';
            if (startDate && endDate) {
                apiUrl += `?limit=200&returnCreationStartDate=${startDate}&returnCreationEndDate=${endDate}`;
            }
            if (nextCursor) {
                apiUrl += `${nextCursor}`;
            }
            const returnResponse = yield this.client.get(apiUrl, {
                headers: this.headers,
            });
            return returnResponse.data;
        });
        const _this = this;
        this.headers = {
            'WM_QOS.CORRELATION_ID': (0, utils_1.randomChar)(),
            'WM_SVC.NAME': config_1.config.wallmartHeder.svcName,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'WM_CONSUMER.CHANNEL.TYPE': config_1.config.wallmartHeder.consumerChannelType, //"2a726cce-b8d0-4a63-b815-dd457cf330ee"
        };
        this.client = axios_1.default.create({
            baseURL: config_1.config.wallmart.baseURL,
            headers: this.headers,
        });
        // Add a request interceptor
        // this.client.interceptors.request.use(function (config) {
        //     console.log("====================HERE iS request interceptor===============")
        //     // Do something before request is sent
        //     return config;
        // }, function (error) {
        //     // Do something with request error
        //     return Promise.reject(error);
        // });
        this.client.interceptors.response.use(function (config) {
            return __awaiter(this, void 0, void 0, function* () {
                // Do something before request is sent
                return config;
            });
        }, function (error) {
            return __awaiter(this, void 0, void 0, function* () {
                // console.log('error.response.status: ', error.response.status)
                try {
                    // if (error.response.status == 401 || error.response.status == 521) {
                    if (error.response.status == 401 &&
                        error.config.url != 'v3/token') {
                        yield _this.getToken(_this.clientId, _this.clientSecret);
                        // await _this.getToken()
                        return {}; // await _this.getItems(1)
                    }
                    else if (error.response.status == 520 ||
                        error.response.status == 500) {
                        return yield axios_1.default.request(error.config);
                    }
                }
                catch (er) {
                    logger_1.default.info(er);
                }
                return Promise.reject(error);
            });
        });
    }
    availableReconFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.accessToken === null) {
                yield this.getToken(this.clientId, this.clientSecret);
            }
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken, Accept: 'application/json', 'Content-Type': 'application/json' });
            const apiResponse = yield this.client.get(`v3/report/reconreport/availableReconFiles?reportVersion=v1`, { headers: this.headers });
            return apiResponse.data;
        });
    }
    onRequestReport(reportType, requestStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.accessToken === null) {
                yield this.getToken(this.clientId, this.clientSecret);
            }
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken, Accept: 'application/json', 'Content-Type': 'application/json' });
            const apiResponse = yield this.client.get(`v3/reports/reportRequests?reportType=${reportType}&requestStatus=${requestStatus}`, { headers: this.headers });
            return apiResponse.data;
        });
    }
    downloadRequestReport(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.accessToken === null) {
                yield this.getToken(this.clientId, this.clientSecret);
            }
            this.headers = Object.assign(Object.assign({}, this.headers), { 'WM_SEC.ACCESS_TOKEN': this.accessToken, Accept: 'application/json', 'Content-Type': 'application/json' });
            const apiResponse = yield this.client.get(`v3/reports/downloadReport?requestId=${requestId}`, { headers: this.headers });
            return apiResponse.data;
        });
    }
}
exports.WallmartClients = WallmartClients;
//# sourceMappingURL=WallmartClients.js.map