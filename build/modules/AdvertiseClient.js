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
exports.AdvertiseClient = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const connection_1 = require("../connection");
class AdvertiseClient extends connection_1.DataSourceConnection {
    constructor() {
        super();
        this.requestData = {};
        this.signature = null;
        this.timestamp = null;
        this.headers = {
            accept: 'application/json',
            'WM_CONSUMER.ID': config_1.config.wallmart.consumerID,
            'WM_SEC.AUTH_SIGNATURE': null,
            'WM_CONSUMER.intimestamp': null,
        };
        this.generateSnapshotReport = () => __awaiter(this, void 0, void 0, function* () {
            const requestData = this.requestData;
            // console.log("HERE IS HEADER",this.headers)
            const apiResponse = yield this.axiosClient.post(`api/v2/snapshot/report?auth_token=${config_1.config.wallmart.authToken}`, requestData, {
                headers: this.headers,
            });
            return apiResponse.data;
        });
        this.getSnapshotReports = (advertiserId, snapshotId) => __awaiter(this, void 0, void 0, function* () {
            const apiResponse = yield this.axiosClient.get(`api/v2/snapshot?auth_token=${config_1.config.wallmart.authToken}&advertiserId=${advertiserId}&snapshotId=${snapshotId}`, {
                headers: this.headers,
            });
            return apiResponse.data;
        });
        this.generateAuthSignature = () => {
            const privateKeyFile = 'agency_production_private_key.pem';
            const epochTime = Math.floor(Date.now());
            const data = config_1.config.wallmart.consumerID +
                '\n' +
                epochTime +
                '\n' +
                config_1.config.wallmart.keyVersion +
                '\n';
            const privateKey = fs_1.default.readFileSync(privateKeyFile);
            const sign = crypto_1.default.createSign('RSA-SHA256');
            sign.update(data);
            const signature = sign.sign(privateKey, 'base64');
            this.signature = signature;
            this.timestamp = epochTime;
        };
        const _this = this;
        this.requestData = {};
        this.axiosClient = axios_1.default.create({
            baseURL: config_1.config.wallmart.AdsBaseURL,
            headers: this.headers,
        });
        // Add a request interceptor
        this.axiosClient.interceptors.request.use(function (config) {
            if (!_this.signature && !_this.timestamp) {
                _this.generateAuthSignature();
            }
            else {
                const startTimestamp = _this.timestamp;
                const endTimestamp = Math.floor(Date.now());
                // Calculate the time difference in seconds
                const timeDifferenceInSeconds = Math.floor((endTimestamp - startTimestamp) / 1000);
                if (timeDifferenceInSeconds > 200) {
                    _this.generateAuthSignature();
                }
            }
            config.headers['WM_SEC.AUTH_SIGNATURE'] = _this.signature;
            config.headers['WM_CONSUMER.intimestamp'] = _this.timestamp;
            // _this.headers['WM_SEC.AUTH_SIGNATURE'] = _this.signature;
            // _this.headers['WM_CONSUMER.intimestamp'] = _this.timestamp;
            // Do something before request is sent
            return config;
        }, function (error) {
            // Do something with request error
            return Promise.reject(error);
        });
    }
}
exports.AdvertiseClient = AdvertiseClient;
//# sourceMappingURL=AdvertiseClient.js.map