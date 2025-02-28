"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = void 0;
const routing_controllers_1 = require("routing-controllers");
const logger_1 = __importDefault(require("../service/logger"));
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const stripeService_1 = require("../service/stripeService");
const sendGridMailService_1 = require("../service/sendGridMailService");
const config_1 = require("../config");
const publicService_1 = require("../service/publicService");
const moment_1 = __importDefault(require("moment"));
let StripeWebhookController = class StripeWebhookController {
    getAll(body, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const payloadString = JSON.stringify(body, null, 2);
            const whsecret = stripeService_1.stripeConfig.stripeWk;
            const header = stripeService_1.stripeConfig.stripe.webhooks.generateTestHeaderString({
                payload: payloadString,
                secret: whsecret,
            });
            let event;
            try {
                const connection = new connection_1.DataSourceConnection();
                const userRepo = (yield connection.publicConnection()).getRepository(Index_1.Users);
                const stripeEventsRepo = (yield connection.publicConnection()).getRepository(Index_1.StripeEvents);
                const stripeSubRepo = (yield connection.publicConnection()).getRepository(Index_1.StripeSubscriptions);
                const stripePlanRepo = (yield connection.publicConnection()).getRepository(Index_1.StripePlans);
                event = stripeService_1.stripeConfig.stripe.webhooks.constructEvent(payloadString, header, whsecret);
                logger_1.default.info(`Stripe event: ${event.type}`);
                // catch all events
                const eventCreationObj = {
                    stripe_event_type: event.type,
                    stripe_event_id: event.id,
                    stripe_customer_id: event.data.object.customer
                        ? event.data.object.customer
                        : null,
                };
                const saveSubscription = stripeEventsRepo.create(eventCreationObj);
                yield stripeEventsRepo.save(saveSubscription);
                // Handle subscription event
                if (event.type === 'customer.subscription.created') {
                    logger_1.default.info(`Stripe subscription event called & db record update`);
                    const subDetailsObj = event.data;
                    const userDetails = yield userRepo.findOne({
                        where: {
                            stripe_customer_id: subDetailsObj.object.customer,
                        },
                    });
                    // create new record in subscription
                    const subCreationObj = {
                        stripe_subscription_id: subDetailsObj.object.id,
                        stripe_price_id: subDetailsObj.object.plan['id'],
                        stripe_customer_id: subDetailsObj.object.customer,
                        user_id: userDetails.id,
                        status: subDetailsObj.object.status,
                        trial_end: subDetailsObj.object.trial_end,
                        cancel_at: subDetailsObj.object.cancel_at,
                        canceled_at: subDetailsObj.object.canceled_at,
                        cancel_at_period_end: subDetailsObj.object.cancel_at_period_end,
                    };
                    const saveSubscription = stripeSubRepo.create(subCreationObj);
                    if (yield stripeSubRepo.save(saveSubscription)) {
                        yield userRepo.update(userDetails.id, {
                            is_subscribed: true,
                        }); // update user details
                        // send subscription mail to user
                        const mailServiceParams = {
                            to: userDetails.email,
                            templateId: config_1.config.mailtemplate.subscriptionmail,
                            dynamicTemplateData: {
                                customerName: (0, publicService_1.getFullName)(userDetails.first_name, userDetails.last_name),
                            },
                        };
                        (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                    }
                }
                // updating the status of subscription.
                if (event.type === 'customer.subscription.updated') {
                    logger_1.default.info(`Stripe subscription update event called & db record update`);
                    if (event.data.object.id && event.data.object.customer) {
                        // check existing user with subscription plan.
                        const subscriptionDetails = yield stripeSubRepo.findOne({
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
                            yield stripeSubRepo.update(subscriptionDetails.id, {
                                status: event.data.object.status,
                                stripe_price_id: update_price,
                                cancel_at: event.data.object.cancel_at,
                                canceled_at: event.data.object.canceled_at,
                                cancel_at_period_end: event.data.object.cancel_at_period_end,
                            });
                            yield userRepo.update({
                                stripe_customer_id: subscriptionDetails.stripe_customer_id,
                            }, {
                                upgrade_required: false,
                            });
                        }
                    }
                }
                // when invoice failed during subscription
                if (event.type === 'invoice.payment_failed') {
                    logger_1.default.info(`Stripe subscription payment failed event called & db record update`);
                    const invDetailsObj = event.data;
                    const checkSusbcription = yield stripeSubRepo.findOne({
                        where: {
                            stripe_subscription_id: invDetailsObj.object.subscription,
                            stripe_customer_id: invDetailsObj.object.customer,
                        },
                    });
                    if (checkSusbcription) {
                        const getPlan = yield stripePlanRepo.findOne({
                            where: {
                                stripe_price_id: checkSusbcription.stripe_price_id,
                            },
                        });
                        const userDetails = yield userRepo.findOne({
                            where: {
                                stripe_customer_id: invDetailsObj.object.customer,
                            },
                        });
                        // make subscription hold
                        yield stripeService_1.stripeConfig.stripe.subscriptions.update(invDetailsObj.object.subscription, {
                            pause_collection: {
                                behavior: 'void',
                            },
                        });
                        // update susbcription records.
                        yield stripeSubRepo.update(checkSusbcription.id, {
                            is_failed: true,
                            invoice_id: invDetailsObj.object.id,
                            failed_link: invDetailsObj.object.hosted_invoice_url
                                ? invDetailsObj.object.hosted_invoice_url
                                : null,
                        });
                        // mail to subscribed user
                        const mailServiceParams = {
                            to: userDetails.email,
                            templateId: config_1.config.mailtemplate.paymentfailmail,
                            dynamicTemplateData: {
                                customerName: (0, publicService_1.getFullName)(userDetails.first_name, userDetails.last_name),
                                subscriptionID: invDetailsObj.object.subscription,
                                subscriptionPlan: getPlan.plan_name,
                                billingCycle: getPlan.interval,
                                amountDue: `${parseFloat(invDetailsObj.object.amountDue) / 100}`,
                            },
                        };
                        (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                        // mail to superuser
                        const adminDetails = yield userRepo.findOne({
                            where: {
                                user_type: 1,
                            },
                        });
                        const mailServiceParamsAdmin = {
                            to: adminDetails.email,
                            templateId: config_1.config.mailtemplate.paymentfailmail,
                            dynamicTemplateData: {
                                customerName: (0, publicService_1.getFullName)(adminDetails.first_name, adminDetails.last_name),
                                sellerName: (0, publicService_1.getFullName)(userDetails.first_name, userDetails.last_name),
                                sellerEmail: userDetails.email,
                                subscriptionID: invDetailsObj.object.subscription,
                                subscriptionPlan: getPlan.plan_name,
                                billingCycle: getPlan.interval,
                                amountDue: `${parseFloat(invDetailsObj.object.amountDue) / 100}`,
                            },
                        };
                        (0, sendGridMailService_1.sendMailTemplate)(mailServiceParamsAdmin);
                    }
                }
                // once failed payment paid by user.
                if (event.type === 'invoice.paid') {
                    logger_1.default.info(`Stripe subscription payment paid event called after once faile & db record update`);
                    const invDetailsObj = event.data;
                    const checkSusbcription = yield stripeSubRepo.findOne({
                        where: {
                            invoice_id: invDetailsObj.object.id,
                            stripe_subscription_id: invDetailsObj.object.subscription,
                            stripe_customer_id: invDetailsObj.object.customer,
                            is_failed: true,
                        },
                    });
                    if (checkSusbcription) {
                        // make subscription resume
                        yield stripeService_1.stripeConfig.stripe.subscriptions.update(invDetailsObj.object.subscription, {
                            pause_collection: {
                                behavior: 'void',
                                resumes_at: (0, moment_1.default)().unix(),
                            },
                        });
                        // update susbcription records.
                        yield stripeSubRepo.update(checkSusbcription.id, {
                            is_failed: false,
                            invoice_id: null,
                            failed_link: null,
                        });
                    }
                }
                return res.status(200).json(event);
            }
            catch (error) {
                logger_1.default.info(`Stripe webhook error: ${error.message}`);
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)('/'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeWebhookController.prototype, "getAll", null);
StripeWebhookController = __decorate([
    (0, routing_controllers_1.JsonController)('/stripe/webhook')
], StripeWebhookController);
exports.StripeWebhookController = StripeWebhookController;
//# sourceMappingURL=StripeWebhookController.js.map