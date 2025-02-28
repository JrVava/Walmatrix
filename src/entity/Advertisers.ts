import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Advertisers {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('date', { nullable: true })
    date: string | null;

    @Column({ nullable: true })
    campaign_name: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    campaign_id: number | null;

    @Column({ nullable: true })
    ad_group_name: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    ad_group_id: number | null;

    @Column({ nullable: true })
    item_name: string | null;

    @Column({
        nullable: true,
        transformer: { to: (value) => parseInt(value), from: (value) => value },
    })
    item_id: number | null;

    @Column({ nullable: true })
    search_keyword: string | null;

    @Column({ nullable: true })
    bidded_keyword: string | null;

    @Column({ nullable: true })
    match_type: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    impressions: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    clicks: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    ctr: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    ad_spend: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    conversion_rate: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    orders: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    conversion_rate_order_based: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    total_attributed_sales: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    advertised_sku_sales: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    other_sku_sales: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    units_sold: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    advertise_sku_units: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    other_sku_units: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    roas: number | null;

    @Column({ nullable: true })
    store_id: number | null;

    @Column({ nullable: true })
    advertiser_report_id: number | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
