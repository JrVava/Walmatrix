import moment from 'moment';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Products {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    sku: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    item_id: number | null;

    @Column({ default: '' })
    product_name: string | null;

    @Column({ default: '' })
    lifecycle_status: string | null;

    @Column({ default: '' })
    publish_status: string | null;

    @Column({ default: '' })
    status_change_reason: string | null;

    @Column({ default: '' })
    product_category: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    price: number | null;

    @Column({ default: '' })
    currency: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    buy_box_item_price: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    buy_box_shipping_price: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    msrp: number | null;

    @Column({ default: '' })
    product_tax_code: string | null;

    @Column({ default: '' })
    ship_methods: string | null;

    @Column({ default: '' })
    shipping_weight: string | null;

    @Column({ default: '' })
    shipping_weight_unit: string | null;

    @Column({ default: '' })
    fulfillment_lag_time: string | null;

    @Column({ default: '' })
    fulfillment_type: string | null;

    @Column({ default: '' })
    wfs_sales_restriction: string | null;

    @Column({ default: '' })
    wpid: string | null;

    @Column({ default: '' })
    gtin: string | null;

    @Column({ default: '' })
    upc: string | null;

    @Column({ default: '' })
    item_page_url: string | null;

    @Column({ default: '' })
    primary_image_url: string | null;

    @Column({ default: '' })
    shelf_name: string | null;

    @Column('jsonb', { nullable: true })
    primary_category_path: string | null;

    @Column({ default: '' })
    brand: string | null;

    @Column({ default: '' })
    offer_start_date: string | null;

    @Column({ default: '' })
    offer_end_date: string | null;

    @Column({ default: '' })
    item_creation_date: string | null;

    @Column({ default: '' })
    item_last_updated: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    reviews_count: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    average_rating: number | null;

    @Column({ default: '' })
    searchable: string | null;

    @Column({ default: '' })
    variant_group_id: string | null;

    @Column({ default: '' })
    primary_variant: string | null;

    @Column({ default: '' })
    variant_grouping_attributes: string | null;

    @Column({ default: '' })
    variant_grouping_values: string | null;

    @Column({ default: '' })
    competitor_url: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    competitor_price: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    competitor_ship_price: number | null;

    @Column({ default: '' })
    competitor_last_date_fetched: string | null;

    @Column({ default: '' })
    repricer_strategy: string | null;

    @Column({ default: '' })
    minimum_seller_allowed_price: string | null;

    @Column({ default: '' })
    maximum_seller_allowed_price: string | null;

    @Column({ default: '' })
    repricer_status: string | null;

    @Column({ nullable: true })
    store_id: number;

    @Column({
        transformer: {
            to: () => moment.utc().format(),
            from: (value) => value,
        },
    })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
