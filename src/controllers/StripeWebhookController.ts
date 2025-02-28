import { JsonController, Res, Body, Post } from 'routing-controllers';
import { Response } from 'express';
import logger from '../service/logger';
import { DataSourceConnection } from '../connection';
import {
    Users,
    StripeSubscriptions,
    StripeEvents,
    StripePlans,
} from '../entity/Index';
import { stripeConfig } from '../service/stripeService';
import { sendMailTemplate } from '../service/sendGridMailService';
import { config } from '../config';
import { getFullName } from '../service/publicService';
import moment from 'moment';

@JsonController('/stripe/webhook')
export class StripeWebhookController {
    @Post('/')
    async getAll(@Body() body: object, @Res() res: Response) {
        const payloadString = JSON.stringify(body, null, 2);
        const whsecret = stripeConfig.stripeWk;
        const header = stripeConfig.stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: whsecret,
        });
        let event;
        try {
            const connection = new DataSourceConnection();
            const userRepo = (
                await connection.publicConnection()
            ).getRepository(Users);
            const stripeEventsRepo = (
                await connection.publicConnection()
            ).getRepository(StripeEvents);
            const stripeSubRepo = (
                await connection.publicConnection()
            ).getRepository(StripeSubscriptions);
            const stripePlanRepo = (
                await connection.publicConnection()
            ).getRepository(StripePlans);
            event = stripeConfig.stripe.webhooks.constructEvent(
                payloadString,
                header,
                whsecret,
            );
            logger.info(`Stripe event: ${event.type}`);

            // catch all events
            const eventCreationObj: Partial<StripeEvents> = {
                stripe_event_type: event.type,
                stripe_event_id: event.id,
                stripe_customer_id: event.data.object.customer
                    ? event.data.object.customer
                    : null,
            };
            const saveSubscription = stripeEventsRepo.create(eventCreationObj);
            await stripeEventsRepo.save(saveSubscription);

            // Handle subscription event
            if (event.type === 'customer.subscription.created') {
                logger.info(
                    `Stripe subscription event called & db record update`,
                );

                const subDetailsObj = event.data;
                const userDetails = await userRepo.findOne({
                    where: {
                        stripe_customer_id: subDetailsObj.object.customer,
                    },
                });

                // create new record in subscription
                const subCreationObj: Partial<StripeSubscriptions> = {
                    stripe_subscription_id: subDetailsObj.object.id,
                    stripe_price_id: subDetailsObj.object.plan['id'],
                    stripe_customer_id: subDetailsObj.object.customer,
                    user_id: userDetails.id,
                    status: subDetailsObj.object.status,
                    trial_end: subDetailsObj.object.trial_end,
                    cancel_at: subDetailsObj.object.cancel_at,
                    canceled_at: subDetailsObj.object.canceled_at,
                    cancel_at_period_end:
                        subDetailsObj.object.cancel_at_period_end,
                };
                const saveSubscription = stripeSubRepo.create(subCreationObj);
                if (await stripeSubRepo.save(saveSubscription)) {
                    await userRepo.update(userDetails.id, {
                        is_subscribed: true,
                    }); // update user details

                    // send subscription mail to user
                    const mailServiceParams = {
                        to: userDetails.email,
                        templateId: config.mailtemplate.subscriptionmail,
                        dynamicTemplateData: {
                            customerName: getFullName(
                                userDetails.first_name,
                                userDetails.last_name,
                            ),
                        },
                    };
                    sendMailTemplate(mailServiceParams);
                }
            }

            // updating the status of subscription.
            if (event.type === 'customer.subscription.updated') {
                logger.info(
                    `Stripe subscription update event called & db record update`,
                );
                if (event.data.object.id && event.data.object.customer) {
                    // check existing user with subscription plan.
                    const subscriptionDetails = await stripeSubRepo.findOne({
                        where: {
                            stripe_subscription_id: event.data.object.id,
                            stripe_customer_id: event.data.object.customer,
                        },
                    });

                    // update subscription status
                    const update_price = event.data.object.plan.id
                        ? event.data.object.plan.id
                        : subscriptionDetails.stripe_price_id;
                    if (subscriptionDetails) {
                        await stripeSubRepo.update(subscriptionDetails.id, {
                            status: event.data.object.status,
                            stripe_price_id: update_price,
                            cancel_at: event.data.object.cancel_at,
                            canceled_at: event.data.object.canceled_at,
                            cancel_at_period_end:
                                event.data.object.cancel_at_period_end,
                        });
                        await userRepo.update(
                            {
                                stripe_customer_id:
                                    subscriptionDetails.stripe_customer_id,
                            },
                            {
                                upgrade_required: false,
                            },
                        );
                    }
                }
            }

            // when invoice failed during subscription
            if (event.type === 'invoice.payment_failed') {
                logger.info(
                    `Stripe subscription payment failed event called & db record update`,
                );
                const invDetailsObj = event.data;
                const checkSusbcription = await stripeSubRepo.findOne({
                    where: {
                        stripe_subscription_id:
                            invDetailsObj.object.subscription,
                        stripe_customer_id: invDetailsObj.object.customer,
                    },
                });
                if (checkSusbcription) {
                    const getPlan = await stripePlanRepo.findOne({
                        where: {
                            stripe_price_id: checkSusbcription.stripe_price_id,
                        },
                    });
                    const userDetails = await userRepo.findOne({
                        where: {
                            stripe_customer_id: invDetailsObj.object.customer,
                        },
                    });

                    // make subscription hold
                    await stripeConfig.stripe.subscriptions.update(
                        invDetailsObj.object.subscription,
                        {
                            pause_collection: {
                                behavior: 'void',
                            },
                        },
                    );

                    // update susbcription records.
                    await stripeSubRepo.update(checkSusbcription.id, {
                        is_failed: true,
                        invoice_id: invDetailsObj.object.id,
                        failed_link: invDetailsObj.object.hosted_invoice_url
                            ? invDetailsObj.object.hosted_invoice_url
                            : null,
                    });

                    // mail to subscribed user
                    const mailServiceParams = {
                        to: userDetails.email,
                        templateId: config.mailtemplate.paymentfailmail,
                        dynamicTemplateData: {
                            customerName: getFullName(
                                userDetails.first_name,
                                userDetails.last_name,
                            ),
                            subscriptionID: invDetailsObj.object.subscription,
                            subscriptionPlan: getPlan.plan_name,
                            billingCycle: getPlan.interval,
                            amountDue: `${
                                parseFloat(invDetailsObj.object.amountDue) / 100
                            }`,
                        },
                    };
                    sendMailTemplate(mailServiceParams);

                    // mail to superuser
                    const adminDetails = await userRepo.findOne({
                        where: {
                            user_type: 1,
                        },
                    });
                    const mailServiceParamsAdmin = {
                        to: adminDetails.email,
                        templateId: config.mailtemplate.paymentfailmail,
                        dynamicTemplateData: {
                            customerName: getFullName(
                                adminDetails.first_name,
                                adminDetails.last_name,
                            ),
                            sellerName: getFullName(
                                userDetails.first_name,
                                userDetails.last_name,
                            ),
                            sellerEmail: userDetails.email,
                            subscriptionID: invDetailsObj.object.subscription,
                            subscriptionPlan: getPlan.plan_name,
                            billingCycle: getPlan.interval,
                            amountDue: `${
                                parseFloat(invDetailsObj.object.amountDue) / 100
                            }`,
                        },
                    };
                    sendMailTemplate(mailServiceParamsAdmin);
                }
            }

            // once failed payment paid by user.
            if (event.type === 'invoice.paid') {
                logger.info(
                    `Stripe subscription payment paid event called after once faile & db record update`,
                );
                const invDetailsObj = event.data;
                const checkSusbcription = await stripeSubRepo.findOne({
                    where: {
                        invoice_id: invDetailsObj.object.id,
                        stripe_subscription_id:
                            invDetailsObj.object.subscription,
                        stripe_customer_id: invDetailsObj.object.customer,
                        is_failed: true,
                    },
                });
                if (checkSusbcription) {
                    // make subscription resume
                    await stripeConfig.stripe.subscriptions.update(
                        invDetailsObj.object.subscription,
                        {
                            pause_collection: {
                                behavior: 'void',
                                resumes_at: moment().unix(),
                            },
                        },
                    );

                    // update susbcription records.
                    await stripeSubRepo.update(checkSusbcription.id, {
                        is_failed: false,
                        invoice_id: null,
                        failed_link: null,
                    });
                }
            }
            return res.status(200).json(event);
        } catch (error) {
            logger.info(`Stripe webhook error: ${error.message}`);
        }
    }
}
