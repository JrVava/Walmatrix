import {
    Get,
    JsonController,
    Res,
    Post,
    Body,
    UseBefore,
    Put,
    Param,
    Req,
} from 'routing-controllers';
import { Response } from 'express';
import Stripe from '../types/stripeInterface';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Users, StripePlans, StripeSubscriptions } from '../entity/Index';
import { DataSourceConnection } from '../connection';
import { checkStripeCustomerId } from '../service/publicService';
import { stripeConfig } from '../service/stripeService';
import moment from 'moment';

@JsonController('/stripe')
@UseBefore(loggingMiddleware)
export class StripeController extends DataSourceConnection {
    @Get('/all-plan')
    async getPlans(@Res() res: Response) {
        try {
            const publicConnection = await this.publicConnection();
            const stripePlansRepository =
                publicConnection.getRepository(StripePlans);
            const allPlans = {
                monthly: await stripePlansRepository.find({
                    where: [{ interval: 'month', is_delete: false }],
                    order: { amount: 'ASC' },
                }),
                yearly: await stripePlansRepository.find({
                    where: [{ interval: 'year', is_delete: false }],
                    order: { amount: 'ASC' },
                }),
            };
            return res.status(200).json(allPlans);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/create-plan')
    async createPlan(@Body() stripeObj: Stripe, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        try {
            // create product & price on stripe
            const {
                amount,
                recurring,
                plan_name,
                description,
                no_of_orders,
                no_of_users,
                real_time_track,
                sales_trend,
                download_reports,
            } = stripeObj;
            const product = await stripeConfig.stripe.products.create({
                name: plan_name,
            });
            const price = await stripeConfig.stripe.prices.create({
                unit_amount: amount * 100,
                currency: stripeConfig.currency,
                recurring: { interval: recurring['interval'] },
                product: product.id,
            });

            // check for price created on stripe or not
            if (price) {
                const stripePlansRepository =
                    publicConnection.getRepository(StripePlans);
                const planExist = await stripePlansRepository.findOne({
                    where: [{ stripe_price_id: price.id }],
                });
                if (planExist) {
                    return res
                        .status(401)
                        .json({ message: 'Plan already exist' });
                }
                const stripePlans: Partial<StripePlans> = {
                    plan_name: plan_name,
                    amount: amount,
                    interval: recurring['interval'],
                    stripe_price_id: price.id,
                    description: description,
                    no_of_orders: no_of_orders,
                    no_of_users: no_of_users,
                    real_time_track: real_time_track,
                    sales_trend: sales_trend,
                    download_reports: download_reports,
                };
                return await stripePlansRepository.save(stripePlans);
            } else {
                return res
                    .status(500)
                    .json({ message: 'Something went wrong' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Put('/update-plan/:id')
    async updateSellerUser(
        @Param('id') id: number,
        @Body() plans: Partial<StripePlans>,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        // check for exists
        const stripePlansRepository =
            publicConnection.getRepository(StripePlans);
        const planExist = await stripePlansRepository.findOne({
            where: { id },
        });
        if (planExist) {
            // update plan details
            if ((await stripePlansRepository.update(id, plans)).affected) {
                const getPlanDetails = await stripePlansRepository.findOne({
                    where: { id },
                });
                return res.status(200).json({
                    data: getPlanDetails,
                    message: 'Plans details has been updated successfully',
                });
            } else {
                return res
                    .status(500)
                    .json({ message: 'Something went wrong' });
            }
        } else {
            return res.status(500).json({ message: `Plan does not exist` });
        }
    }

    @Get('/get-plan-details/:id')
    async getPlanDetails(@Param('id') id: number, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const stripePlansRepository =
            publicConnection.getRepository(StripePlans);
        const getPlanDetails = await stripePlansRepository.findOne({
            where: { id: id },
        });
        if (getPlanDetails) {
            return res.status(200).json(getPlanDetails);
        } else {
            return res.status(401).json({ message: `Plan does not exists` });
        }
    }

    @Post('/get-stripe-plan')
    async getStripePlanDetails(
        @Body() stripeObj: Stripe,
        @Res() res: Response,
    ) {
        try {
            const { price } = stripeObj;
            const priceDetails =
                await stripeConfig.stripe.prices.retrieve(price);
            return res.status(200).json(priceDetails);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/create-customer')
    async create(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { email, customer_name } = stripeObj;
            const customerDetails = await stripeConfig.stripe.customers.create({
                email: email,
                name: customer_name,
            });
            return res.status(200).json(customerDetails);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/create-subscription')
    async createSubscription(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const publicConnection = await this.publicConnection();
            let customerId = null;
            let subscriptionPayload;
            const { success_url, line_items, user_id } = stripeObj;
            // const { success_url, line_items, user_id, discounts } = stripeObj;
            const userRepo = publicConnection.getRepository(Users);
            const userExist = await userRepo.findOne({
                where: { id: user_id },
            });
            if (!userExist) {
                return res.status(401).json({ message: 'User does not exist' });
            }
            customerId = await checkStripeCustomerId(userExist);
            if (customerId) {
                subscriptionPayload = {
                    line_items: [
                        {
                            price: line_items['price'],
                            quantity: 1,
                        },
                    ],
                    mode: stripeConfig.subscriptionMode,
                    success_url: success_url,
                    customer: customerId,
                    subscription_data: {
                        trial_period_days: 30,
                    },
                    // payment_method_collection: 'if_required',
                };
                // if (discounts) {
                //     subscriptionPayload['discounts'] = [
                //         {
                //             coupon: stripeConfig.coupon,
                //         },
                //     ];
                // }
                const sessionResponse =
                    await stripeConfig.stripe.checkout.sessions.create(
                        subscriptionPayload,
                    );
                return res.status(200).json(sessionResponse);
            } else {
                return res
                    .status(401)
                    .send({ message: 'Something went wrong' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/get-event-detail')
    async getEventDetails(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { event } = stripeObj;
            const eventDetails =
                await stripeConfig.stripe.events.retrieve(event);
            return res.status(200).json(eventDetails);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/upgrade-subscription')
    async upgradeSubscription(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { customer, old_price, new_price } = stripeObj;
            const publicConnection = await this.publicConnection();
            const userRepo = publicConnection.getRepository(Users);
            const userExist = await userRepo.findOne({
                where: { stripe_customer_id: customer },
            });
            // check user
            if (!userExist) {
                return res.status(401).json({ message: 'User does not exist' });
            }
            const currentDetails = await stripeConfig.stripe.subscriptions.list(
                {
                    customer: customer,
                    price: old_price,
                },
            );

            // upgrade plan
            if (currentDetails.data.length) {
                const subscriptionId = currentDetails.data[0].id;
                const subscriptionItemId =
                    currentDetails.data[0].items.data[0].id;
                const subscriptionDetails =
                    await stripeConfig.stripe.subscriptions.update(
                        subscriptionId,
                        {
                            payment_behavior: 'pending_if_incomplete',
                            proration_behavior: 'always_invoice',
                            items: [
                                {
                                    id: subscriptionItemId,
                                    price: new_price,
                                },
                            ],
                        },
                    );
                return res.status(200).json(subscriptionDetails);
            } else {
                return res
                    .status(401)
                    .json({ message: 'Subscription not found' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/get-invoice-detail')
    async getDetails(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { invoice } = stripeObj;
            const invoiceDetail =
                await stripeConfig.stripe.invoices.retrieve(invoice);
            return res.status(200).json(invoiceDetail);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/get-next-invoice')
    async getUpcoming(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { customer, subscription } = stripeObj;
            const invoices =
                await stripeConfig.stripe.invoices.retrieveUpcoming({
                    customer: customer,
                    subscription: subscription,
                });
            return res.status(200).json(invoices);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Post('/get-all-invoice')
    async getAllInvoices(@Body() stripeObj: Stripe, @Res() res: Response) {
        try {
            const { customer, subscription } = stripeObj;
            const allInvoices = await stripeConfig.stripe.invoices.list({
                customer: customer,
                status: 'paid',
                subscription: subscription,
            });
            return res.status(200).json(allInvoices);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Get('/cancel-subscription')
    async cancelSubscription(@Req() req: Request, @Res() res: Response) {
        try {
            const publicConnection = await this.publicConnection();
            const email = req.headers['email'];
            const userRepo = publicConnection.getRepository(Users);

            const stripeSubRepo =
                publicConnection.getRepository(StripeSubscriptions);
            const userExist = await userRepo.findOne({
                where: { email: email },
            });
            // check user
            if (!userExist) {
                return res.status(401).json({ message: 'User does not exist' });
            }
            //find customer subscription
            const subscriptionData = await stripeSubRepo.findOne({
                where: { stripe_customer_id: userExist.stripe_customer_id },
            });
            const currentDetails =
                await stripeConfig.stripe.subscriptions.update(
                    subscriptionData.stripe_subscription_id,
                    {
                        cancel_at_period_end: true,
                        cancellation_details: {
                            comment: 'Not using service',
                            feedback: 'unused',
                        },
                    },
                );
            return res.status(200).json(currentDetails);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    @Get('/resume-subscription')
    async resumeSubscription(@Req() req: Request, @Res() res: Response) {
        const email = req.headers['email'];
        const connection = await this.publicConnection();
        const stripeSubRepo = connection.getRepository(StripeSubscriptions);
        const userRepo = connection.getRepository(Users);

        const userExist = await userRepo.findOne({
            where: { email: email },
        });
        // check user
        if (!userExist) {
            return res.status(401).json({ message: 'User does not exist' });
        }

        //find subscription
        const getSubscriptionData = await stripeSubRepo.findOne({
            where: {
                user_id: userExist.id,
                stripe_customer_id: userExist.stripe_customer_id,
            },
        });

        if (getSubscriptionData.cancel_at_period_end) {
            const currentAt = moment.utc().unix();
            const cancelAt = getSubscriptionData.cancel_at;
            if (cancelAt > currentAt) {
                await stripeConfig.stripe.subscriptions.update(
                    getSubscriptionData.stripe_subscription_id,
                    {
                        cancel_at_period_end: false,
                    },
                );
                return res
                    .status(200)
                    .json({ message: 'Subscription resume successfully' });
            } else {
                return res.status(501).json({
                    message:
                        'Please purchse new plan, for continue your services',
                });
            }
        } else {
            return res.status(501).json({ message: 'Something went wrong' });
        }
    }
}
