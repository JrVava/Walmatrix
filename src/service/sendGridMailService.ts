import sendGridMail from '@sendgrid/mail';
import { config } from '../config';
import logger from './logger';

sendGridMail.setApiKey(config.sendgrid.sendgrid_key);

function getMessage(mailServiceParams) {
    const body = mailServiceParams.html; //'This is a test email using SendGrid from Node.js';

    return {
        to: mailServiceParams.to,
        from: config.sendgrid.sendgrid_from,
        subject: mailServiceParams.subject,
        text: body,
        html: `<strong>${body}</strong>`,
    };
}

export async function sendEmail(mailServiceParams) {
    try {
        await sendGridMail.send(getMessage(mailServiceParams));
    } catch (error) {
        if (error.response) {
            logger.info(error.response.body);
        }
    }
}

export async function sendMailTemplate(mailParams) {
    try {
        await sendGridMail.send({
            from: config.sendgrid.sendgrid_from,
            templateId: mailParams.templateId,
            personalizations: [
                {
                    to: { email: mailParams.to },
                    dynamicTemplateData: mailParams.dynamicTemplateData,
                },
            ],
        });
    } catch (error) {
        if (error.response) {
            logger.info(error.response.body);
        }
    }
}
