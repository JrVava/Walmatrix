import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    OneToOne,
} from 'typeorm';
import { encryptData, removeSpcialCharacters } from './../modules/utils';
import { StripeSubscriptions, UsersSettings } from '../entity/Index';

@Entity()
export class Users {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column({
        unique: true,
        transformer: {
            to: (value) => value.toLowerCase(),
            from: (value) => value,
        },
    })
    email: string;

    @Column({
        select: false,
        transformer: {
            to: (value) => encryptData(value),
            from: (value) => value,
        },
    })
    password: string;

    @Column({ default: true })
    is_active: boolean;

    @Column()
    user_type: number;

    @Column({ default: false })
    is_freeze: boolean;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => removeSpcialCharacters(value.toLowerCase()),
            from: (value) => value,
        },
    })
    store_name: string;

    @Column({ nullable: true })
    verify_code: string;

    @Column({ nullable: true })
    verify_code_at: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    store_id: number;

    @Column({ default: false })
    is_deleted: boolean;

    @OneToOne(() => UsersSettings, (userSettings) => userSettings.user)
    usersSettings: UsersSettings;

    @Column({ default: false })
    is_user_sso: boolean;

    // @Column({ nullable: true })
    // storeConfig: number;

    @Column('text', { nullable: true })
    profile: string;

    @Column({ default: false })
    is_verified: boolean;

    @Column({ nullable: true })
    acc_verify_code: string;

    @Column({ nullable: true })
    company_name: string;

    @Column({ nullable: true })
    stripe_customer_id: string;

    @Column({ default: false })
    is_subscribed: boolean;

    @Column({ default: false })
    upgrade_required: boolean;

    @OneToOne(
        () => StripeSubscriptions,
        (stripeSubscriptions) => stripeSubscriptions.user_id,
    )
    stripeSubscriptions: StripeSubscriptions;
}
