import { Users } from '../entity/Index';
import { DataSourceConnection } from '../connection';
import { stripeConfig } from './stripeService';
import logger from './logger';

export const checkStripeCustomerId = async (userObj: Users) => {
    let customerId = null;
    const connection = new DataSourceConnection();
    const userRepo = (await connection.publicConnection()).getRepository(Users);
    if (userObj.stripe_customer_id) {
        customerId = userObj.stripe_customer_id;
    } else {
        // create new customer on stripe.
        try {
            const checkCustomerInStripe =
                await stripeConfig.stripe.customers.list({
                    email: userObj.email,
                });

            if (checkCustomerInStripe.data.length <= 0) {
                const customerDetails =
                    await stripeConfig.stripe.customers.create({
                        email: userObj.email,
                        name: getFullName(
                            userObj.first_name,
                            userObj.last_name,
                        ),
                    });
                customerId = customerDetails.id;
            } else {
                customerId = checkCustomerInStripe.data[0].id;
            }
            // update user by stripe customerid
            await userRepo.update(userObj.id, {
                stripe_customer_id: customerId,
            });
        } catch (error) {
            logger.info('stripe: customer create', error);
            customerId = null;
        }
    }

    return customerId;
};

export function getFullName(fname: string, lname: string) {
    return `${fname} ${lname}`;
}
