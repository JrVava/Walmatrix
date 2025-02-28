"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.fetchToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function fetchToken(head) {
    var _a;
    const token = (_a = head['authorization']) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    return token;
}
exports.fetchToken = fetchToken;
function generateToken(payload) {
    // const token = jwt.sign({ email: payload }, config.jwtSecret, {
    //   expiresIn: expired_in,
    // });
    const token = jsonwebtoken_1.default.sign({ email: payload }, config_1.config.jwtSecret);
    return token;
}
exports.generateToken = generateToken;
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        return decoded;
    }
    catch (err) {
        throw new Error('Invalid token');
    }
}
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map