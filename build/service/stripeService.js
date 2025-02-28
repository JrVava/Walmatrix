"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeConfig = void 0;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
exports.stripeConfig = {
    stripe: new stripe_1.default(config_1.config.stripe.SECRET_KEY || '', {
        apiVersion: '2023-08-16',
    }),
    stripePk: new stripe_1.default(config_1.config.stripe.PUBLISHED_KEY || '', {
        apiVersion: '2023-08-16',
    }),
    stripeWk: config_1.config.stripe.WEBHOOK_KEY,
    coupon: config_1.config.stripe.COUPON,
    subscriptionMode: config_1.config.stripe.SUBSCRIPTIONMODE,
    currency: config_1.config.stripe.CURRENCY,
};
//# sourceMappingURL=stripeService.js.map