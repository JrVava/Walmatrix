import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class StripeEvents {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stripe_event_type: string;

    @Column()
    stripe_event_id: string;

    @Column()
    stripe_customer_id: string;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
