import { config } from '../config';
import { OAuth2Client } from 'google-auth-library';

export const verifyCode = async (code: string) => {
    try {
        const client = new OAuth2Client(config.googleClientId);

        const ticket = await client.verifyIdToken({
            idToken: code,
            audience: config.googleClientId,
        });
        return ticket.getPayload();
    } catch (err) {
        throw Error('Invalid google auth code');
    }
};
