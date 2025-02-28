import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Recon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    period_start_date: string | null;

    @Column({ default: '' })
    period_end_date: string | null;

    @Column({ default: '' })
    total_payable: number | null;

    @Column({ default: '' })
    currency: string | null;

    @Column({ default: '' })
    transaction_key: string | null;

    @Column('date', { nullable: true })
    transaction_posted_timestamp: string | null;

    @Column({ default: '' })
    transaction_type: string | null;

    @Column({ default: '' })
    transaction_description: string | null;

    @Column({ default: '' })
    customer_order: string | null;

    @Column({ default: '' })
    customer_order_line: number | null;

    @Column({ default: '' })
    purchase_order: string | null;

    @Column({ default: '' })
    purchase_order_line: number | null;

    @Column({ default: '' })
    amount: number | null;

    @Column({ default: '' })
    amount_type: string | null;

    @Column({ default: '' })
    ship_qty: number | null;

    @Column({ default: '' })
    commission_rate: number | null;

    @Column({ default: '' })
    transaction_reason_description: string | null;

    @Column({ default: '' })
    partner_item_id: string | null;

    @Column({ default: '' })
    partner_gtin: string | null;

    @Column({ default: '' })
    partner_item_name: string | null;

    @Column({ default: '' })
    product_tax_code: number | null;

    @Column({ default: '' })
    ship_to_state: string | null;

    @Column({ default: '' })
    ship_to_city: string | null;

    @Column({ default: '' })
    ship_to_zipcode: string | null;

    @Column({ default: '' })
    contract_category: string | null;

    @Column({ default: '' })
    product_type: string | null;

    @Column({ default: '' })
    commission_rule: string | null;

    @Column({ default: '' })
    shipping_method: string | null;

    @Column({ default: '' })
    fulfillment_type: string | null;

    @Column({ default: '' })
    fulfillment_details: string | null;

    @Column({ default: '' })
    original_commission: number | null;

    @Column({ default: '' })
    commission_incentive_program: string | null;

    @Column({ default: '' })
    commission_saving: number | null;

    @Column({ default: '' })
    customer_promo_type: string | null;

    @Column({ default: '' })
    total_walmart_funded_savings_program: string | null;

    @Column({ default: '' })
    campaign_id: number | null;

    @Column({ default: '' })
    store_id: number | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
