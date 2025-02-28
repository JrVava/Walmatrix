import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Users } from './Index';

@Entity()
export class StripeSubscriptions {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stripe_subscription_id: string;

    @Column()
    stripe_price_id: string;

    @Column()
    stripe_customer_id: string;

    @Column()
    @OneToOne(() => Users, (users) => users.id)
    @JoinColumn({ name: 'user_id' })
    user_id: number | null;

    @Column({ nullable: true })
    status: string;

    @Column({ nullable: true })
    trial_end: number;

    @Column({ default: false })
    is_failed: boolean;

    @Column({ nullable: true })
    invoice_id: string;

    @Column('text', { nullable: true })
    failed_link: string;

    @Column({ nullable: true })
    canceled_at: number;

    @Column({ nullable: true })
    cancel_at: number;

    @Column({ default: false })
    cancel_at_period_end: boolean;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
