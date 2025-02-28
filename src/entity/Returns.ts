import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Returns {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    return_order_id: string | null;

    @Column({ default: '' })
    customer_email_id: string | null;

    @Column('jsonb', { nullable: true })
    customer_name: string | null;

    @Column({ default: '' })
    customer_order_id: string | null;

    @Column({ default: '' })
    return_order_date: string | null;

    @Column({ default: '' })
    return_by_date: string | null;

    @Column({ default: '' })
    refund_mode: string | null;

    @Column({ default: '' })
    total_currency_amount: number | null;

    @Column({ default: '' })
    total_currency_unit: string | null;

    @Column('jsonb', { nullable: true })
    return_line_groups: string | null;

    @Column('jsonb', { nullable: true })
    return_order_lines: string | null;

    @Column({ default: '' })
    return_channel_name: string | null;

    @Column({ nullable: true })
    store_id: number;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
