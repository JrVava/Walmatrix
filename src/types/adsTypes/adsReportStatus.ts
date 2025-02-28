export interface AdsReportStatus {
    advertise_id: number;
    snapshot_id: string;
    ads_manage_id: number;
    download_path: string;
    user_id: number;
    store_id: number;
    ad_id: number;
    start_date: string;
    end_date: string;
    report_type: string;
    report_metrics: [];
    user_setting_id: number;
}
