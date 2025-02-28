import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { randomChar } from './utils';

import { config } from './../config';
import { Wallmart_items } from '../types/ItemsInterface';
import { Wallmart_orders } from '../types/orders/ordersInterface';
import { DataSourceConnection } from '../connection';
import logger from '../service/logger';
import { ReconManagement } from '../entity/ReconManagement';
import { AwsService } from '../service/awsService';

interface tokenResult {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export class WallmartClients extends DataSourceConnection {
    public headers = {};
    // private accessToken: string | null = null
    public accessToken: string | null = null;
    private client: AxiosInstance;
    public clientId: string | null = null;
    public clientSecret: string | null = null;

    constructor() {
        super();
        const _this = this;
        this.headers = {
            'WM_QOS.CORRELATION_ID': randomChar(),
            'WM_SVC.NAME': config.wallmartHeder.svcName, //"Walmart Service Name",
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'WM_CONSUMER.CHANNEL.TYPE':
                config.wallmartHeder.consumerChannelType, //"2a726cce-b8d0-4a63-b815-dd457cf330ee"
        };

        this.client = axios.create({
            baseURL: config.wallmart.baseURL,
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
        this.client.interceptors.response.use(
            async function (config) {
                // Do something before request is sent
                return config;
            },
            async function (error) {
                // console.log('error.response.status: ', error.response.status)
                try {
                    // if (error.response.status == 401 || error.response.status == 521) {
                    if (
                        error.response.status == 401 &&
                        error.config.url != 'v3/token'
                    ) {
                        await _this.getToken(
                            _this.clientId,
                            _this.clientSecret,
                        );

                        // await _this.getToken()
                        return {}; // await _this.getItems(1)
                    } else if (
                        error.response.status == 520 ||
                        error.response.status == 500
                    ) {
                        return await axios.request(error.config);
                    }
                } catch (er) {
                    logger.info(er);
                }
                return Promise.reject(error);
            },
        );
    }

    public getToken = async (clientId, clientSecret) => {
        try {
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            this.headers['Accept'] = 'application/json';
            // const response: AxiosResponse = await this.client.post('v3/token', { "grant_type": "client_credentials" }, { headers: this.headers, auth: { username: config.wallmart.clientId, password: config.wallmart.clientSecret } })
            const response: AxiosResponse = await this.client.post(
                'v3/token',
                { grant_type: 'client_credentials' },
                {
                    headers: this.headers,
                    auth: { username: clientId, password: clientSecret },
                },
            );

            const tokenResult: tokenResult = response.data;
            this.accessToken = tokenResult.access_token;
            // console.log({data : response.data,statusCode :response.status});
            return { data: response.data, statusCode: response.status };
        } catch (error) {
            if (error.response) {
                // console.log("Error status code:", error.response.status);
                // console.log("Error message:", error.response.data);
                return {
                    statusCode: error.response.status,
                    message: error.response.data,
                };
            } else {
                return {
                    statusCode: 500,
                    message: 'Internal Server Error',
                };
            }
        }
    };

    getItems = async (page: number = 0) => {
        this.headers['Content-Type'] = 'application/json';
        await this.getToken(this.clientId, this.clientSecret);
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
        };
        const itemURL =
            page != 0
                ? `v3/items?limit=200&offset=${page}`
                : `v3/items?limit=200`;
        const itemResponse: AxiosResponse = await this.client.get(itemURL, {
            headers: this.headers,
        });
        return itemResponse.data as Wallmart_items;
    };

    getOrders = async (
        createDate?: string,
        shipNodeType?: string,
        nextCursor?: string,
    ) => {
        try {
            this.headers['Content-Type'] = 'application/json';
            if (this.accessToken === null) {
                await this.getToken(this.clientId, this.clientSecret);
            }
            // await this.getToken(); // Added await this.getToken for getting the token
            this.headers = {
                ...this.headers,
                'WM_SEC.ACCESS_TOKEN': this.accessToken,
            };
            let apiUrl = 'v3/orders';
            if (createDate && shipNodeType) {
                apiUrl += `?limit=200&createdStartDate=${createDate}&shipNodeType=${shipNodeType}`;
            }

            if (nextCursor) {
                apiUrl += `${nextCursor}`;
            }
            const orderResponse: AxiosResponse = await this.client.get(apiUrl, {
                headers: this.headers,
            });
            // console.log('orderResponse:', orderResponse.data); // Add this line
            return orderResponse.data as Wallmart_orders;
        } catch (err) {
            return err;
        }
    };

    getReconReportCSV = async (
        date?: string,
        store_id?: string,
        user_id?: number,
        file_id?: number,
    ) => {
        await this.getToken(this.clientId, this.clientSecret);
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
            Accept: 'application/octet-stream',
            'Content-Type': 'application/zip',
        };

        const apiResponse: AxiosResponse = await this.client.get(
            `v3/report/reconreport/reconFile?reportDate=${date}&reportVersion=v1`,
            { headers: this.headers, responseType: 'arraybuffer' },
        );
        const s3Client = new AwsService();
        const fileName = `file_${date}-${store_id}.zip`;
        const fileUploaded = await s3Client.uploadBuferToS3(
            `${store_id}/${user_id}/recon/${fileName}`,
            apiResponse.data,
        );
        if (
            fileUploaded &&
            fileUploaded?.result?.$metadata?.httpStatusCode == 200
        ) {
            const connection = await this.publicConnection();
            const reconManageRepository =
                connection.getRepository(ReconManagement);
            await reconManageRepository.update(
                { id: file_id, available_date: date },
                { is_file_downloaded: true },
            );
            await connection.destroy();
            return { status: 200 };
        } else {
            return { status: 501 };
        }
    };

    async availableReconFiles() {
        if (this.accessToken === null) {
            await this.getToken(this.clientId, this.clientSecret);
        }
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        const apiResponse: AxiosResponse = await this.client.get(
            `v3/report/reconreport/availableReconFiles?reportVersion=v1`,
            { headers: this.headers },
        );
        return apiResponse.data;
    }

    getReturn = async (
        startDate?: string,
        endDate?: string,
        nextCursor?: string,
    ) => {
        this.headers['Content-Type'] = 'application/json';
        if (this.accessToken === null) {
            await this.getToken(this.clientId, this.clientSecret);
        }
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
        };
        let apiUrl = 'v3/returns';

        if (startDate && endDate) {
            apiUrl += `?limit=200&returnCreationStartDate=${startDate}&returnCreationEndDate=${endDate}`;
        }
        if (nextCursor) {
            apiUrl += `${nextCursor}`;
        }
        const returnResponse: AxiosResponse = await this.client.get(apiUrl, {
            headers: this.headers,
        });
        return returnResponse.data;
    };

    async onRequestReport(reportType: string, requestStatus: string) {
        if (this.accessToken === null) {
            await this.getToken(this.clientId, this.clientSecret);
        }
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        const apiResponse: AxiosResponse = await this.client.get(
            `v3/reports/reportRequests?reportType=${reportType}&requestStatus=${requestStatus}`,
            { headers: this.headers },
        );
        return apiResponse.data;
    }

    async downloadRequestReport(requestId: string) {
        if (this.accessToken === null) {
            await this.getToken(this.clientId, this.clientSecret);
        }
        this.headers = {
            ...this.headers,
            'WM_SEC.ACCESS_TOKEN': this.accessToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        const apiResponse: AxiosResponse = await this.client.get(
            `v3/reports/downloadReport?requestId=${requestId}`,
            { headers: this.headers },
        );
        return apiResponse.data;
    }
}
