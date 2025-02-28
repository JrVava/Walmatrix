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
exports.sendMailTemplate = exports.sendEmail = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
mail_1.default.setApiKey(config_1.config.sendgrid.sendgrid_key);
function getMessage(mailServiceParams) {
    const body = mailServiceParams.html; //'This is a test email using SendGrid from Node.js';
    return {
        to: mailServiceParams.to,
        from: config_1.config.sendgrid.sendgrid_from,
        subject: mailServiceParams.subject,
        text: body,
        html: `<strong>${body}</strong>`,
    };
}
function sendEmail(mailServiceParams) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mail_1.default.send(getMessage(mailServiceParams));
        }
        catch (error) {
            if (error.response) {
                logger_1.default.info(error.response.body);
            }
        }
    });
}
exports.sendEmail = sendEmail;
function sendMailTemplate(mailParams) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mail_1.default.send({
                from: config_1.config.sendgrid.sendgrid_from,
                templateId: mailParams.templateId,
                personalizations: [
                    {
                        to: { email: mailParams.to },
                        dynamicTemplateData: mailParams.dynamicTemplateData,
                    },
                ],
            });
        }
        catch (error) {
            if (error.response) {
                logger_1.default.info(error.response.body);
            }
        }
    });
}
exports.sendMailTemplate = sendMailTemplate;
//# sourceMappingURL=sendGridMailService.js.map