"use strict";
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
exports.getFullName = exports.checkStripeCustomerId = void 0;
const Index_1 = require("../entity/Index");
const connection_1 = require("../connection");
const stripeService_1 = require("./stripeService");
const logger_1 = __importDefault(require("./logger"));
const checkStripeCustomerId = (userObj) => __awaiter(void 0, void 0, void 0, function* () {
    let customerId = null;
    const connection = new connection_1.DataSourceConnection();
    const userRepo = (yield connection.publicConnection()).getRepository(Index_1.Users);
    if (userObj.stripe_customer_id) {
        customerId = userObj.stripe_customer_id;
    }
    else {
        // create new customer on stripe.
        try {
            const checkCustomerInStripe = yield stripeService_1.stripeConfig.stripe.customers.list({
                email: userObj.email,
            });
            if (checkCustomerInStripe.data.length <= 0) {
                const customerDetails = yield stripeService_1.stripeConfig.stripe.customers.create({
                    email: userObj.email,
                    name: getFullName(userObj.first_name, userObj.last_name),
                });
                customerId = customerDetails.id;
            }
            else {
                customerId = checkCustomerInStripe.data[0].id;
            }
            // update user by stripe customerid
            yield userRepo.update(userObj.id, {
                stripe_customer_id: customerId,
            });
        }
        catch (error) {
            logger_1.default.info('stripe: customer create', error);
            customerId = null;
        }
    }
    return customerId;
});
exports.checkStripeCustomerId = checkStripeCustomerId;
function getFullName(fname, lname) {
    return `${fname} ${lname}`;
}
exports.getFullName = getFullName;
//# sourceMappingURL=publicService.js.map