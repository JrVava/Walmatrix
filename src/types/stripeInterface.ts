export default interface Stripe {
    customer?: string;
    amount?: number;
    currency?: string;
    recurring?: Array<{
        interval?: string;
    }>;
    product?: string;
    price?: string;
    plan_name?: string;
    description?: string;
    email?: string;
    customer_name?: string;
    success_url?: string;
    line_items?: Array<{
        price?: string;
        quantity?: number;
    }>;
    discounts?: boolean;
    event: string;
    user_id: number;
    no_of_orders: number;
    no_of_users: number;
    real_time_track: boolean;
    sales_trend: boolean;
    download_reports: boolean;
    old_price: string;
    new_price: string;
    invoice: string;
    subscription: string;
}
