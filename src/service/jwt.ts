import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IncomingHttpHeaders } from 'http';

export function fetchToken(head: IncomingHttpHeaders): string {
    const token: string = head['authorization']?.split(' ')[1];
    return token;
}

export function generateToken(payload: string): string {
    // const token = jwt.sign({ email: payload }, config.jwtSecret, {
    //   expiresIn: expired_in,
    // });
    const token = jwt.sign({ email: payload }, config.jwtSecret);
    return token;
}

export function verifyToken(token: string): string {
    try {
        const decoded = <string>jwt.verify(token, config.jwtSecret);
        return decoded;
    } catch (err) {
        throw new Error('Invalid token');
    }
}
