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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeController = void 0;
const routing_controllers_1 = require("routing-controllers");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const Index_1 = require("../entity/Index");
const connection_1 = require("../connection");
const publicService_1 = require("../service/publicService");
const stripeService_1 = require("../service/stripeService");
let StripeController = class StripeController extends connection_1.DataSourceConnection {
    getPlans(res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stripePlansRepository = (yield this.publicConnection()).getRepository(Index_1.StripePlans);
                const allPlans = {
                    monthly: yield stripePlansRepository.find({
                        where: [{ interval: 'month', is_delete: false }],
                        order: { amount: 'ASC' },
                    }),
                    yearly: yield stripePlansRepository.find({
                        where: [{ interval: 'year', is_delete: false }],
                        order: { amount: 'ASC' },
                    }),
                };
                return res.status(200).json(allPlans);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    createPlan(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // create product & price on stripe
                const { amount, recurring, plan_name, description, no_of_orders, no_of_users, real_time_track, sales_trend, download_reports, } = stripeObj;
                const product = yield stripeService_1.stripeConfig.stripe.products.create({
                    name: plan_name,
                });
                const price = yield stripeService_1.stripeConfig.stripe.prices.create({
                    unit_amount: amount * 100,
                    currency: stripeService_1.stripeConfig.currency,
                    recurring: { interval: recurring['interval'] },
                    product: product.id,
                });
                // check for price created on stripe or not
                if (price) {
                    const stripePlansRepository = (yield this.publicConnection()).getRepository(Index_1.StripePlans);
                    const planExist = yield stripePlansRepository.findOne({
                        where: [{ stripe_price_id: price.id }],
                    });
                    if (planExist) {
                        return res
                            .status(401)
                            .json({ message: 'Plan already exist' });
                    }
                    const stripePlans = {
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
                    return yield stripePlansRepository.save(stripePlans);
                }
                else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    updateSellerUser(id, plans, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // check for exists
            const stripePlansRepository = (yield this.publicConnection()).getRepository(Index_1.StripePlans);
            const planExist = yield stripePlansRepository.findOne({
                where: { id },
            });
            if (planExist) {
                // update plan details
                if ((yield stripePlansRepository.update(id, plans)).affected) {
                    const getPlanDetails = yield stripePlansRepository.findOne({
                        where: { id },
                    });
                    return res.status(200).json({
                        data: getPlanDetails,
                        message: 'Plans details has been updated successfully',
                    });
                }
                else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            }
            else {
                return res.status(500).json({ message: `Plan does not exist` });
            }
        });
    }
    getPlanDetails(id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripePlansRepository = (yield this.publicConnection()).getRepository(Index_1.StripePlans);
            const getPlanDetails = yield stripePlansRepository.findOne({
                where: { id: id },
            });
            if (getPlanDetails) {
                return res.status(200).json(getPlanDetails);
            }
            else {
                return res.status(401).json({ message: `Plan does not exists` });
            }
        });
    }
    getStripePlanDetails(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { price } = stripeObj;
                const priceDetails = yield stripeService_1.stripeConfig.stripe.prices.retrieve(price);
                return res.status(200).json(priceDetails);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    create(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, customer_name } = stripeObj;
                const customerDetails = yield stripeService_1.stripeConfig.stripe.customers.create({
                    email: email,
                    name: customer_name,
                });
                return res.status(200).json(customerDetails);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    createSubscription(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let customerId = null;
                let subscriptionPayload;
                const { success_url, line_items, user_id } = stripeObj;
                // const { success_url, line_items, user_id, discounts } = stripeObj;
                const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userExist = yield userRepo.findOne({
                    where: { id: user_id },
                });
                if (!userExist) {
                    return res.status(401).json({ message: 'User does not exist' });
                }
                customerId = yield (0, publicService_1.checkStripeCustomerId)(userExist);
                if (customerId) {
                    subscriptionPayload = {
                        line_items: [
                            {
                                price: line_items['price'],
                                quantity: 1,
                            },
                        ],
                        mode: stripeService_1.stripeConfig.subscriptionMode,
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
                    const sessionResponse = yield stripeService_1.stripeConfig.stripe.checkout.sessions.create(subscriptionPayload);
                    return res.status(200).json(sessionResponse);
                }
                else {
                    return res
                        .status(401)
                        .send({ message: 'Something went wrong' });
                }
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    getEventDetails(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { event } = stripeObj;
                const eventDetails = yield stripeService_1.stripeConfig.stripe.events.retrieve(event);
                return res.status(200).json(eventDetails);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    upgradeSubscription(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customer, old_price, new_price } = stripeObj;
                const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userExist = yield userRepo.findOne({
                    where: { stripe_customer_id: customer },
                });
                // check user
                if (!userExist) {
                    return res.status(401).json({ message: 'User does not exist' });
                }
                const currentDetails = yield stripeService_1.stripeConfig.stripe.subscriptions.list({
                    customer: customer,
                    price: old_price,
                });
                // upgrade plan
                if (currentDetails.data.length) {
                    const subscriptionId = currentDetails.data[0].id;
                    const subscriptionItemId = currentDetails.data[0].items.data[0].id;
                    const subscriptionDetails = yield stripeService_1.stripeConfig.stripe.subscriptions.update(subscriptionId, {
                        payment_behavior: 'pending_if_incomplete',
                        proration_behavior: 'always_invoice',
                        items: [
                            {
                                id: subscriptionItemId,
                                price: new_price,
                            },
                        ],
                    });
                    return res.status(200).json(subscriptionDetails);
                }
                else {
                    return res
                        .status(401)
                        .json({ message: 'Subscription not found' });
                }
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    getDetails(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { invoice } = stripeObj;
                const invoiceDetail = yield stripeService_1.stripeConfig.stripe.invoices.retrieve(invoice);
                return res.status(200).json(invoiceDetail);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    getUpcoming(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customer, subscription } = stripeObj;
                const invoices = yield stripeService_1.stripeConfig.stripe.invoices.retrieveUpcoming({
                    customer: customer,
                    subscription: subscription,
                });
                return res.status(200).json(invoices);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    getAllInvoices(stripeObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customer, subscription } = stripeObj;
                const allInvoices = yield stripeService_1.stripeConfig.stripe.invoices.list({
                    customer: customer,
                    status: 'paid',
                    subscription: subscription,
                });
                return res.status(200).json(allInvoices);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
    cancelSubscription(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = req.headers['email'];
                const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                const stripeSubRepo = (yield this.publicConnection()).getRepository(Index_1.StripeSubscriptions);
                const userExist = yield userRepo.findOne({
                    where: { email: email },
                });
                // check user
                if (!userExist) {
                    return res.status(401).json({ message: 'User does not exist' });
                }
                //find customer subscription
                const subscriptionData = yield stripeSubRepo.findOne({
                    where: { stripe_customer_id: userExist.stripe_customer_id },
                });
                const currentDetails = yield stripeService_1.stripeConfig.stripe.subscriptions.update(subscriptionData.stripe_subscription_id, {
                    cancel_at_period_end: true,
                    cancellation_details: {
                        comment: 'Not using service',
                        feedback: 'unused',
                    },
                });
                return res.status(200).json(currentDetails);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/all-plan'),
    __param(0, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getPlans", null);
__decorate([
    (0, routing_controllers_1.Post)('/create-plan'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "createPlan", null);
__decorate([
    (0, routing_controllers_1.Put)('/update-plan/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "updateSellerUser", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-plan-details/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getPlanDetails", null);
__decorate([
    (0, routing_controllers_1.Post)('/get-stripe-plan'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getStripePlanDetails", null);
__decorate([
    (0, routing_controllers_1.Post)('/create-customer'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "create", null);
__decorate([
    (0, routing_controllers_1.Post)('/create-subscription'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "createSubscription", null);
__decorate([
    (0, routing_controllers_1.Post)('/get-event-detail'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getEventDetails", null);
__decorate([
    (0, routing_controllers_1.Post)('/upgrade-subscription'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "upgradeSubscription", null);
__decorate([
    (0, routing_controllers_1.Post)('/get-invoice-detail'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getDetails", null);
__decorate([
    (0, routing_controllers_1.Post)('/get-next-invoice'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getUpcoming", null);
__decorate([
    (0, routing_controllers_1.Post)('/get-all-invoice'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "getAllInvoices", null);
__decorate([
    (0, routing_controllers_1.Get)('/cancel-subscription'),
    __param(0, (0, routing_controllers_1.Req)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "cancelSubscription", null);
StripeController = __decorate([
    (0, routing_controllers_1.JsonController)('/stripe'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], StripeController);
exports.StripeController = StripeController;
//# sourceMappingURL=StripeController.js.map