import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class OrderCharges {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    purchase_order_id: string | null;

    @Column({ default: '' })
    customer_order_id: string | null;

    @Column({ nullable: true })
    product_amount: number;

    @Column({ nullable: true })
    order_tax: number;

    @Column({ nullable: true })
    order_id: number;

    @Column({ nullable: true })
    charge_type: string | null;

    @Column({ nullable: true })
    order_status: string | null;

    @Column({ nullable: true })
    sku: string | null;

    @Column({ nullable: true })
    order_line_number: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
