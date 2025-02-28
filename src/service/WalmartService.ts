import { DataSourceConnection } from '../connection';
import { Recon, ReconManagement } from '../entity/Index';
import { WallmartClients } from '../modules/WallmartClients';
import { AwsService } from './awsService';
import unzipper from 'unzipper';
import { wallmartQueues } from './walmartQueue';
import moment from 'moment';
import { streamToString } from '../modules/utils';
import logger from './logger';

export class WalmartService extends DataSourceConnection {
    public walmartClient = new WallmartClients();

    async getReconDates(data) {
        const publicConnection = await this.publicConnection();
        const reconManageRepository =
            publicConnection.getRepository(ReconManagement);
        this.walmartClient.accessToken = null;
        this.walmartClient.clientId = null;
        this.walmartClient.clientSecret = null;

        // Passing the clientId and clientSecret
        this.walmartClient.clientId = data.client_id;
        this.walmartClient.clientSecret = data.client_secret;
        const reconDates = await this.walmartClient.availableReconFiles();

        for (const date of reconDates?.availableApReportDates) {
            const reconManageData: Partial<ReconManagement> = {
                id: null,
                user_setting_id: data.user_setting_id,
                available_date: date,
            };

            const checkDataExist = await reconManageRepository.findOne({
                where: {
                    user_setting_id: data.user_setting_id,
                    available_date: date,
                },
            });

            if (checkDataExist) {
                reconManageData.id = checkDataExist.id;
            }

            const saveReconDate =
                await reconManageRepository.save(reconManageData);

            const reconDownloadFileRelatedObj = {
                client_id: data.client_id,
                client_secret: data.client_secret,
                user_id: data.user_id,
                user_setting_id: data.user_setting_id,
                store_id: data.store_id,
                available_date: date,
                recon_management_id: saveReconDate.id,
            };
            await wallmartQueues.add(
                'download-recon-file',
                reconDownloadFileRelatedObj,
                { removeDependencyOnFailure: true },
            );
        }
        await publicConnection.destroy();
    }

    async downloadReconFile(reconDownloadFileRelated) {
        const data = reconDownloadFileRelated;
        logger.info('Data From Download Recon File Function', data);
        this.walmartClient.accessToken = null;
        this.walmartClient.clientId = null;
        this.walmartClient.clientSecret = null;

        // Passing the clientId and clientSecret
        this.walmartClient.clientId = data.client_id;
        this.walmartClient.clientSecret = data.client_secret;

        const reportData = await this.walmartClient.getReconReportCSV(
            data.available_date,
            data.store_id,
            data.user_id,
            data.recon_management_id,
        );

        if (reportData.status == 200) {
            return `file downloaded success for store ${data.store_id} and date ${data.available_date}`;
        } else {
            return `file not downloaded for store ${data.store_id} and date ${data.available_date}`;
        }
    }

    async readReconCsvData(data) {
        const awsService = new AwsService();
        const s3Response = await awsService.readCSV(data.file_path);
        const bodyContents: any = s3Response.Body;
        const schemaConnection = await this.connection(
            `default_${data.user_id}`,
        );
        const store_id = data.store_id;
        const reconRepository = schemaConnection.getRepository(Recon);
        const readStream = bodyContents.pipe(unzipper.Parse());
        readStream.on('entry', async (entry) => {
            const bodyContents = await streamToString(entry);
            const csvDatas: any = await bodyContents;

            const result = await Promise.all(
                csvDatas.map((data) => {
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
                        transaction_posted_timestamp: !!data[
                            'Transaction Posted Timestamp'
                        ]
                            ? moment(
                                  data['Transaction Posted Timestamp'],
                                  'MM/DD/YYYY',
                              ).format('YYYY-MM-DD')
                            : null,
                        transaction_type: data['Transaction Type'],
                        transaction_description:
                            data['Transaction Description'],
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
                        transaction_reason_description:
                            data['Transaction Reason Description'],
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
                        commission_incentive_program:
                            data['Commission Incentive Program'],
                        commission_saving: data['Commission Saving']
                            ? parseFloat(data['Commission Saving'])
                            : 0,
                        customer_promo_type: data['Customer Promo Type'],
                        total_walmart_funded_savings_program:
                            data['Total Walmart Funded Savings Program'],
                        campaign_id:
                            data['Campaign Id'] === undefined
                                ? 0
                                : parseFloat(data['Campaign Id']),
                        store_id: store_id,
                    };
                }),
            );
            await reconRepository.save(result, { chunk: 100 });
            const publicConnection = await this.publicConnection();
            const reconManageRepository =
                publicConnection.getRepository(ReconManagement);

            await reconManageRepository.update(
                {
                    id: data.file_id,
                    available_date: data.available_date,
                },
                { is_file_read: true },
            );
            await publicConnection.destroy();
            await schemaConnection.destroy();
        });
    }
}
