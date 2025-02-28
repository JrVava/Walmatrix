import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Orders {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    purchase_order_id: string | null;

    @Column({ default: '' })
    customer_order_id: string | null;

    @Column({ default: '' })
    customer_email_id: string | null;

    @Column({ type: 'bigint', default: 0 })
    order_date: bigint | null;

    @Column('jsonb', { nullable: true })
    shipping_info: { shippingInfo: string | null };

    @Column('jsonb', { default: { orderLine: [] } })
    order_lines: {
        orderLine: string[];
    };

    @Column({ default: '' })
    ship_node: string | null;

    @Column({ nullable: true })
    store_id: number;

    @Column('date', { nullable: true })
    formated_date: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
