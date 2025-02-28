import { NextFunction, Request, Response } from 'express';
import { verifyToken, generateToken, fetchToken } from './jwt';
import { revokedTokens } from './revokedTokens';
import { Users } from '../entity/Users';
import { DataSourceConnection } from '../connection';

export const loggingMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    //get the jwt token from the head
    const token = fetchToken(req.headers);
    let jwtPayload;

    if (!token) {
        return res.status(401).send('No token provided');
    }

    if (revokedTokens.includes(token)) {
        return res.status(401).json({ message: 'Unauthorized request' });
    }

    try {
        jwtPayload = verifyToken(token);
        const email = jwtPayload.email;

        req.headers['email'] = email;

        const dataSourceObj = new DataSourceConnection();
        const usersRepository = (
            await dataSourceObj.publicConnection()
        ).getRepository(Users);

        // get store name and store to header
        // const userData = await usersRepository.findOne({
        //     where: { email, is_deleted: false },
        //     relations: ['stripeSubscriptions']
        // });

        const userData = await usersRepository
            .createQueryBuilder('user')
            .select('user.id', 'id')
            .addSelect('user.store_name', 'store_name')
            .addSelect('user.stripe_customer_id', 'stripe_customer_id')
            .addSelect('user.email', 'email')
            .addSelect('stripe_plan.stripe_price_id', 'stripe_price_id')
            .addSelect('stripe_plan.id', 'stripe_id')
            .addSelect('stripe_plan.amount', 'stripe_amount')
            .addSelect('stripe_plan.plan_name', 'stripe_plan')
            .addSelect('stripe_plan.interval', 'interval')
            .addSelect('stripe_plan.no_of_orders', 'no_of_orders')
            .addSelect('stripe_plan.no_of_users', 'no_of_users')
            .leftJoin(
                'stripe_subscriptions',
                'stripe_sub',
                'stripe_sub.stripe_customer_id = user.stripe_customer_id',
            )
            .leftJoin(
                'stripe_plans',
                'stripe_plan',
                'stripe_plan.stripe_price_id = stripe_sub.stripe_price_id',
            )
            .where('user.email = :email', { email: email })
            .andWhere('user.is_deleted = :is_deleted', { is_deleted: false })
            .getRawOne();
        if (userData) {
            req.headers['store_name'] = userData?.store_name
                ? userData?.store_name
                : 'public';
            const stripeObj = {
                stripe_customer_id: userData.stripe_customer_id,
                stripe_price_id: userData.stripe_price_id,
                stripe_id: userData.stripe_id,
                stripe_amount:
                    userData.stripe_amount === null
                        ? 0
                        : userData.stripe_amount,
                stripe_plan: userData.stripe_plan,
                interval: userData.interval,
                no_of_orders:
                    userData.no_of_orders === null ? 0 : userData.no_of_orders,
                no_of_users:
                    userData.no_of_users === null ? 0 : userData.no_of_users,
            };
            req.headers['stripe'] = JSON.stringify(stripeObj);
        } else {
            return res.status(401).json({ message: 'Unauthorized request' });
        }
    } catch (error) {
        // If token is not valid, respond with 401 (unauthorized)
        return res.status(401).json({ message: 'Unauthorized request' });
    }

    // The token is valid for 1 hour
    // We want to send new tokens on every request

    const newToken = generateToken(jwtPayload);
    res.setHeader('token', newToken);

    // Call the next middleware or Controller
    next();
};
