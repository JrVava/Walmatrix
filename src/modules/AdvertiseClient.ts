import axios, { AxiosInstance, AxiosResponse } from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config';
import { DataSourceConnection } from '../connection';
import { AdItemResponse } from '../types/adsTypes/adItemResponse';

export class AdvertiseClient extends DataSourceConnection {
    public requestData = {};
    public signature = null;
    public timestamp = null;
    public headers = {
        accept: 'application/json',
        'WM_CONSUMER.ID': config.wallmart.consumerID,
        'WM_SEC.AUTH_SIGNATURE': null,
        'WM_CONSUMER.intimestamp': null,
    };
    private axiosClient: AxiosInstance;
    constructor() {
        super();
        const _this = this;
        this.requestData = {};

        this.axiosClient = axios.create({
            baseURL: config.wallmart.AdsBaseURL,
            headers: this.headers,
        });

        // Add a request interceptor
        this.axiosClient.interceptors.request.use(
            function (config) {
                if (!_this.signature && !_this.timestamp) {
                    _this.generateAuthSignature();
                } else {
                    const startTimestamp = _this.timestamp;
                    const endTimestamp = Math.floor(Date.now());
                    // Calculate the time difference in seconds
                    const timeDifferenceInSeconds = Math.floor(
                        (endTimestamp - startTimestamp) / 1000,
                    );
                    if (timeDifferenceInSeconds > 200) {
                        _this.generateAuthSignature();
                    }
                }
                config.headers['WM_SEC.AUTH_SIGNATURE'] = _this.signature;
                config.headers['WM_CONSUMER.intimestamp'] = _this.timestamp;

                // Do something before request is sent
                return config;
            },
            function (error) {
                // Do something with request error
                return Promise.reject(error);
            },
        );
    }

    public generateSnapshotReport = async (): Promise<AdItemResponse> => {
        const requestData = this.requestData;
        // console.log("HERE IS HEADER",this.headers)
        const apiResponse: AxiosResponse = await this.axiosClient.post(
            `api/v2/snapshot/report?auth_token=${config.wallmart.authToken}`,
            requestData,
            {
                headers: this.headers,
            },
        );

        return apiResponse.data;
    };

    public getSnapshotReports = async (
        advertiserId: number,
        snapshotId: string,
    ) => {
        const apiResponse: AxiosResponse = await this.axiosClient.get(
            `api/v2/snapshot?auth_token=${config.wallmart.authToken}&advertiserId=${advertiserId}&snapshotId=${snapshotId}`,
            {
                headers: this.headers,
            },
        );

        return apiResponse.data;
    };

    private generateAuthSignature = (): void => {
        const privateKeyFile = 'agency_production_private_key.pem';
        const epochTime = Math.floor(Date.now());
        const data =
            config.wallmart.consumerID +
            '\n' +
            epochTime +
            '\n' +
            config.wallmart.keyVersion +
            '\n';
        const privateKey = fs.readFileSync(privateKeyFile);

        const sign = crypto.createSign('RSA-SHA256');
        sign.update(data);
        const signature = sign.sign(privateKey, 'base64');

        this.signature = signature;
        this.timestamp = epochTime;
    };

    /**
     * Get campaign reports for an advertiser
     * @param advertiserId String
     * @returns
     */
    public getCampaignReports = async (advertiserId: number) => {
        const apiResponse: AxiosResponse = await this.axiosClient.get(
            `api/v1/campaigns?auth_token=${config.wallmart.authToken}&advertiserId=${advertiserId}`,
            {
                headers: this.headers,
            },
        );

        return apiResponse.data;
    };
}
