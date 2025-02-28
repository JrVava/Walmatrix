import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ReturnCharges {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    charge_category: string | null;

    @Column({ default: '' })
    charge_name: string | null;

    @Column({ default: '' })
    currency_amount: number | null;

    @Column({ default: '' })
    currency_unit: string | null;

    @Column({ default: '' })
    is_discount: boolean | null;

    @Column({ default: '' })
    is_billable: boolean | null;

    @Column({ default: '' })
    tax_name: string | null;

    @Column({ default: '' })
    tax_currency_amount: number | null;

    @Column({ default: '' })
    tax_currency_unit: string | null;

    @Column({ default: '' })
    tax_tax_per_unit_currency_amount: number | null;

    @Column({ default: '' })
    tax_tax_per_unit_currency_unit: string | null;

    @Column({ nullable: true })
    return_id: number;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
