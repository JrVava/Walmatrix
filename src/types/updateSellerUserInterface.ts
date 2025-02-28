export default interface UpdateSellerUser {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    is_active: boolean;
    user_type: number;
    store_name: string;
    seller_id?: number;
    client_id?: string;
    client_secret?: string;
}
