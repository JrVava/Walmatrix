export default interface UsersUpdate {
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    user_type: number;
    client_id: string;
    client_secret: string;
    phone: string;
    company_name: string;
    stripe_customer_id: string;
    is_subscribed: boolean;
}
