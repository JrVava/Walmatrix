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
exports.AuthController = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const jwt_1 = require("../service/jwt");
const revokedTokens_1 = require("../service/revokedTokens");
const utils_1 = require("../modules/utils");
const config_1 = require("../config");
const sendGridMailService_1 = require("../service/sendGridMailService");
const googleService_1 = require("../service/googleService");
const Index_1 = require("../entity/Index");
const publicService_1 = require("../service/publicService");
const logger_1 = __importDefault(require("../service/logger"));
let AuthController = class AuthController extends connection_1.DataSourceConnection {
    // Create Seller
    verifyEmail(user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, utils_1.validateEmail)(user.email)) {
                return res.status(400).json({ message: 'Invalid email' });
            }
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            // Check if email already exists
            const emailExist = yield usersRepository.findOne({
                where: [{ email: user.email }],
            });
            if (emailExist) {
                return res.status(400).json({ message: 'Email already exist' });
            }
            else {
                return res
                    .status(200)
                    .json({ message: 'Email available to create' });
            }
        });
    }
    // Create Seller by Signup
    post(user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, utils_1.validateEmail)(user.email)) {
                return res.status(401).json({ message: 'Invalid email' });
            }
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            // Check if user already exists
            const emailExist = yield usersRepository.findOne({
                where: [{ email: user.email }],
            });
            if (emailExist) {
                return res.status(401).json({ message: 'Email already exist' });
            }
            const fakeStoreName = (0, utils_1.removeSpcialCharacters)(user.email.toLowerCase().split('@')[0]);
            const userData = Object.assign(Object.assign({}, user), { store_name: fakeStoreName, password: (0, utils_1.generateVerificationCode)(8) });
            if (config_1.config.userTypes.includes(user.user_type)) {
                try {
                    // console.log("Hello from1", await usersRepository.save(user));
                    if (yield usersRepository.save(userData)) {
                        const createdUser = yield usersRepository.findOne({
                            where: { email: user.email },
                        });
                        const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
                        // Below code is for add new store config
                        const schemaName = `default_${createdUser.id}`;
                        const storeConfig = {
                            user_id: createdUser.id,
                            store_name: schemaName,
                            name: 'Default',
                        };
                        // Here store config is saved
                        const saveStoreConfig = storeConfigRepository.create(storeConfig);
                        const getStore = yield storeConfigRepository.save(saveStoreConfig);
                        // Below line is for updating the store_name in user Table
                        yield usersRepository.update(createdUser.id, {
                            store_name: schemaName,
                            store_id: getStore.id,
                        });
                        // Below Line is for creating a new Schema
                        yield (0, utils_1.createTenantSchema)(schemaName);
                        // Insert new user into new tenant user table
                        const tenatUsersRepo = (yield this.connection(schemaName)).getRepository(Index_1.Users);
                        if (yield tenatUsersRepo.save(Object.assign(Object.assign({}, user), { store_name: schemaName, password: (0, utils_1.generateVerificationCode)(8) }))) {
                            const getTenantUser = yield tenatUsersRepo.findOne({
                                where: { email: user.email },
                            });
                            // create account verification link
                            const encyptedString = (0, utils_1.encryptData)(createdUser.id.toString());
                            const accVerificationCode = (0, utils_1.generateVerificationCode)(32);
                            const verificationLink = `${config_1.config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;
                            if (yield usersRepository.update(createdUser.id, {
                                acc_verify_code: accVerificationCode,
                            })) {
                                // send account verification mail
                                const mailActiveParams = {
                                    to: user.email,
                                    templateId: config_1.config.mailtemplate.accverifymail,
                                    dynamicTemplateData: {
                                        customerName: (0, publicService_1.getFullName)(user.first_name, user.last_name),
                                        verificationLink: verificationLink,
                                    },
                                };
                                (0, sendGridMailService_1.sendMailTemplate)(mailActiveParams);
                                logger_1.default.info('Send account verification mail on seller creation auth controller');
                            }
                            // Return new created user
                            return res.send({
                                data: getTenantUser,
                                message: 'Thank you for signing up! A verification email has been sent. Please verify your email to log in',
                            });
                        }
                    }
                }
                catch (err) {
                    return res.send(err);
                }
            }
            else {
                return res.status(401).json({ message: 'Invalid user type' });
            }
        });
    }
    login(login, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //Check if email and password are set
            const { email, password } = login;
            if (!(email.trim() && password.trim())) {
                return res
                    .status(400)
                    .json({ message: 'Email and password are not set' });
            }
            //Get user from database
            try {
                // Check user exists to public.users table
                const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
                // start: check for verification for seller and seller' user
                const userVerifiedDetails = yield usersRepository.findOne({
                    where: {
                        email: login.email,
                        is_deleted: false,
                        is_verified: false,
                    },
                });
                if (userVerifiedDetails &&
                    (userVerifiedDetails.user_type == 2 ||
                        userVerifiedDetails.user_type == 4) &&
                    !userVerifiedDetails.is_verified) {
                    return res.status(401).json({
                        message: "You haven't verify your account yet, first verify it. For more info please contact to support.",
                    });
                }
                // end: check for verification for seller and seller' user
                const userDetails = yield usersRepository.findOne({
                    where: {
                        email: login.email,
                        password: login.password,
                        is_deleted: false,
                    },
                });
                if (!userDetails) {
                    return res
                        .status(401)
                        .json({ message: 'Invalid email and password' });
                }
                // when inactive
                if (!userDetails.is_active) {
                    return res.status(401).json({
                        message: `${email.trim()} is inactive, please contact to support`,
                    });
                }
                // This is for sellers login only
                // Check user exists to tenant.users table
                let userTenantDetails;
                if (config_1.config.userTypes.includes(userDetails.user_type)) {
                    const usersTenantRepository = (yield this.connection(userDetails.store_name)).getRepository(Index_1.Users);
                    userTenantDetails = yield usersTenantRepository.findOne({
                        where: {
                            email: login.email,
                            password: login.password,
                            is_active: true,
                            is_deleted: false,
                        },
                    });
                    if (!userTenantDetails) {
                        return res
                            .status(401)
                            .json({ message: 'Invalid user email and password' });
                    }
                }
                // End
                // Sign JWT , valid for 1 hour
                const token = (0, jwt_1.generateToken)(userDetails.email);
                // Check if the user's token has been revoked
                if (revokedTokens_1.revokedTokens.includes(token)) {
                    return res
                        .status(401)
                        .json({ message: 'Unauthorized request' });
                }
                return { data: userDetails, accessToken: token };
            }
            catch (error) {
                return res
                    .status(401)
                    .send({ message: 'Emails and password does not matched' });
            }
        });
    }
    forgotPassword(forgotPassword, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Send forgot password mail to user
            // const emailTemplate = verifyEmailTamplate(otp);
            // Generate verify code
            const code = (0, utils_1.generateVerificationCode)(32);
            const resetURL = `${config_1.config.frontend_url}reset-password?vc=${code}`;
            //set code to public user table and tenat user table
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const userDetails = yield usersRepository.findOne({
                where: {
                    email: forgotPassword.email,
                    is_deleted: false,
                },
            });
            if (userDetails) {
                // when user not verified
                if (!userDetails.is_verified) {
                    return res.status(401).json({
                        message: "You haven't verify your account yet,first verify it.for more info please contact to support",
                    });
                }
                // when inactive
                if (!userDetails.is_active) {
                    return res.status(401).json({
                        message: `${forgotPassword.email} is inactive, please contact to support`,
                    });
                }
                const mailServiceParams = {
                    to: userDetails.email,
                    cc: '',
                    bcc: '',
                    subject: 'Forgot Password',
                    text: '',
                    html: `Dear User,<br><br>Please click on Reset Pasword button for creating new password :<br><br><a clicktracking="off" href="${resetURL}"> 
        <button style="color: rgba(0, 0, 0, 0.87);
        background-color: rgb(255, 193, 14);
        width: 100%;
        box-shadow: none;
        font-weight: 500;
        padding: 8px 22px;
        border-radius: 4px;">Reset Password </button> </a>`,
                };
                if ((0, sendGridMailService_1.sendEmail)(mailServiceParams)) {
                    if ((yield usersRepository.update(userDetails.id, {
                        verify_code: code,
                        verify_code_at: (0, utils_1.getCurrentDateTime)(),
                    })).affected) {
                        if (config_1.config.userTypes.includes(userDetails.user_type)) {
                            const usersTenantRepository = (yield this.connection(userDetails.store_name)).getRepository(Index_1.Users);
                            const userTenantDetails = yield usersTenantRepository.findOne({
                                where: {
                                    email: forgotPassword.email,
                                    is_active: true,
                                    is_deleted: false,
                                },
                            });
                            if (userTenantDetails) {
                                if ((yield usersTenantRepository.update(userTenantDetails.id, {
                                    verify_code: code,
                                    verify_code_at: (0, utils_1.getCurrentDateTime)(),
                                })).affected) {
                                    return res.json({
                                        message: 'Reset password email has been sent successfully',
                                    });
                                }
                            }
                        }
                        else {
                            return res.json({
                                message: 'Reset password email has been sent successfully',
                            });
                        }
                    }
                    else {
                        return res
                            .status(401)
                            .send({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res
                        .status(401)
                        .send({ message: 'Maiil not sending, Please try again!' });
                }
            }
            else {
                return res.status(401).json({ message: 'Email does not exist' });
            }
        });
    }
    resetPassword(resetPassword, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify code for reset password request
            try {
                // Check user exists to public.users table
                const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userDetails = yield usersRepository.findOne({
                    where: {
                        verify_code: resetPassword.verify_code,
                        is_active: true,
                        is_deleted: false,
                    },
                });
                if (!userDetails) {
                    return res.status(401).json({ message: 'Invalid verify code' });
                }
                if ((yield usersRepository.update(userDetails.id, {
                    password: resetPassword.password,
                    verify_code: null,
                })).affected) {
                    // Check user exists to tenant.users table
                    if (config_1.config.userTypes.includes(userDetails.user_type)) {
                        const usersTenantRepository = (yield this.connection(userDetails.store_name)).getRepository(Index_1.Users);
                        const userTenantDetails = yield usersTenantRepository.findOne({
                            where: {
                                verify_code: resetPassword.verify_code,
                                is_active: true,
                                is_deleted: false,
                            },
                        });
                        if (!userTenantDetails) {
                            return res
                                .status(401)
                                .json({ message: 'Invalid verify code' });
                        }
                        if ((yield usersTenantRepository.update(userTenantDetails.id, {
                            password: resetPassword.password,
                            verify_code: null,
                        })).affected) {
                            // success for seller tenent user
                        }
                        else {
                            return res
                                .status(401)
                                .send({ message: 'Something went wrong' });
                        }
                    }
                    return res.json({
                        message: 'Reset password has been successfully',
                    });
                }
                else {
                    return res
                        .status(401)
                        .send({ message: 'Something went wrong' });
                }
            }
            catch (error) {
                return res.status(401).send({ message: 'Something went wrong' });
            }
        });
    }
    logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Handle logout logic here
            const token = (0, jwt_1.fetchToken)(req.headers);
            if (!token) {
                return res.status(401).send({ message: 'No token provided' });
            }
            revokedTokens_1.revokedTokens.push(token); // Revoke the token
            return res.json({ message: 'Logout successfully' });
        });
    }
    googleLogin(login, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the code from the query
                if (!login.google_access_token) {
                    return res
                        .status(401)
                        .json({ message: 'Authorization code not provided!' });
                }
                const payload = yield (0, googleService_1.verifyCode)(login.google_access_token);
                // Check if email is verified
                if (!payload && payload.email_verified) {
                    return res
                        .status(403)
                        .json({ message: 'Google account not verified' });
                }
                const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userDetails = yield usersRepository.findOne({
                    where: {
                        email: payload.email,
                        is_deleted: false,
                    },
                });
                let createdUser;
                let getCreatedUser;
                // Create  user if user already not exist
                if (!userDetails) {
                    // return res
                    //         .status(401)
                    //         .json({ message: "Sorry, User doesn't exist." });
                    const fakeStoreName = (0, utils_1.removeSpcialCharacters)(payload.email.toLowerCase().split('@')[0]);
                    const user = {
                        first_name: payload.given_name,
                        last_name: payload.family_name,
                        email: payload.email,
                        password: (0, utils_1.generateVerificationCode)(8),
                        user_type: 2,
                        is_user_sso: true,
                    };
                    const userData = Object.assign(Object.assign({}, user), { store_name: fakeStoreName });
                    // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
                    if (config_1.config.userTypes.includes(user.user_type)) {
                        try {
                            if (yield usersRepository.save(userData)) {
                                createdUser = yield usersRepository.findOne({
                                    where: { email: user.email },
                                });
                                const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
                                // Below code is for add new store config
                                const schemaName = `default_${createdUser.id}`;
                                const storeConfig = {
                                    user_id: createdUser.id,
                                    store_name: schemaName,
                                    name: 'Default',
                                };
                                // Here store config is saved
                                const saveStoreConfig = storeConfigRepository.create(storeConfig);
                                const getStore = yield storeConfigRepository.save(saveStoreConfig);
                                // Below line is for updating the store_name in user Table
                                yield usersRepository.update(createdUser.id, {
                                    store_name: schemaName,
                                    store_id: getStore.id,
                                });
                                // Create tenant
                                yield (0, utils_1.createTenantSchema)(schemaName);
                                // Insert new user into new tenant user table
                                const tenatUsersRepo = (yield this.connection(schemaName)).getRepository(Index_1.Users);
                                if (yield tenatUsersRepo.save(userData)) {
                                    yield tenatUsersRepo.findOne({
                                        where: { email: user.email },
                                    });
                                    // send welcome mail
                                    const mailServiceParams = {
                                        to: createdUser.email,
                                        templateId: config_1.config.mailtemplate.welcomemail,
                                        dynamicTemplateData: {
                                            customerName: (0, publicService_1.getFullName)(createdUser.first_name, createdUser.last_name),
                                        },
                                    };
                                    (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                                }
                                getCreatedUser = yield usersRepository.findOne({
                                    where: { email: user.email },
                                });
                            }
                        }
                        catch (err) {
                            return res.send(err);
                        }
                    }
                    else {
                        return res
                            .status(401)
                            .json({ message: 'Invalid user type or store name' });
                    }
                }
                // Sign JWT , valid for 1 hour
                const token = (0, jwt_1.generateToken)(payload.email);
                // Check if the user's token has been revoked
                if (revokedTokens_1.revokedTokens.includes(token)) {
                    return res
                        .status(401)
                        .json({ message: 'Unauthorized request' });
                }
                return res.status(200).json({
                    data: userDetails ? userDetails : getCreatedUser,
                    accessToken: token,
                });
            }
            catch (err) {
                return res
                    .status(401)
                    .json({ message: 'Failed to authorize Google User' });
            }
        });
    }
    oldsetNewPassword(encstr, uuid, changePassword, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt((0, utils_1.decryptData)(encstr));
                const { new_password } = changePassword;
                // check for user exits and links verification.
                const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
                const getUser = yield usersRepository.findOne({
                    where: { id: userId, acc_verify_code: uuid },
                });
                if (!getUser) {
                    return res.status(404).send({ message: 'User not found' });
                }
                if (getUser.is_verified) {
                    return res
                        .status(404)
                        .send({ message: 'You are already verified' });
                }
                // update new password
                yield usersRepository.update({ id: userId }, { password: new_password.trim(), is_verified: true });
                const userDetails = yield usersRepository.findOne({
                    where: { id: userId },
                });
                const tenatUsersRepo = (yield this.connection(userDetails.store_name)).getRepository(Index_1.Users);
                const userTenatDetails = yield tenatUsersRepo.findOne({
                    where: { email: userDetails.email },
                });
                if (userTenatDetails) {
                    yield tenatUsersRepo.update({ email: userDetails.email }, { password: new_password.trim(), is_verified: true });
                    // send welcome mail
                    const mailServiceParams = {
                        to: userDetails.email,
                        templateId: config_1.config.mailtemplate.welcomemail,
                        dynamicTemplateData: {
                            customerName: (0, publicService_1.getFullName)(userDetails.first_name, userDetails.last_name),
                        },
                    };
                    (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                }
                return res.status(200).send({
                    data: userDetails,
                    message: 'New password has been update successfully',
                });
            }
            catch (err) {
                return res.status(401).send({ message: 'Something went wrong' });
            }
        });
    }
    setNewPassword(encstr, uuid, changePassword, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { new_password } = changePassword;
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUser = yield usersRepository.findOne({
                where: { acc_verify_code: uuid },
            });
            if (getUser.is_verified) {
                return res
                    .status(404)
                    .send({ message: 'You are already verified' });
            }
            if (getUser) {
                yield usersRepository.update({ id: getUser.id }, { password: new_password, is_verified: true });
                const tenatUsersRepo = (yield this.connection(getUser.store_name)).getRepository(Index_1.Users);
                const userTenatDetails = yield tenatUsersRepo.findOne({
                    where: { email: getUser.email },
                });
                if (userTenatDetails) {
                    yield tenatUsersRepo.update({ email: getUser.email }, { password: new_password, is_verified: true });
                    // send welcome mail
                    const mailServiceParams = {
                        to: getUser.email,
                        templateId: config_1.config.mailtemplate.welcomemail,
                        dynamicTemplateData: {
                            customerName: (0, publicService_1.getFullName)(getUser.first_name, getUser.last_name),
                        },
                    };
                    (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                }
                return res
                    .status(200)
                    .send({ message: 'New password has been update successfully' });
            }
            return res.status(404).send({ message: 'User not found' });
        });
    }
    sendActivationMail(changePasswordObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = changePasswordObj;
                const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userDetails = yield usersRepository.findOne({
                    where: { email: email },
                });
                if (!userDetails) {
                    return res.status(404).send({ message: 'User not found' });
                }
                if (userDetails.is_verified) {
                    return res
                        .status(404)
                        .send({ message: 'User are already verified' });
                }
                const encyptedString = (0, utils_1.encryptData)(userDetails.id.toString());
                const accVerificationCode = (0, utils_1.generateVerificationCode)(32);
                const verificationLink = `${config_1.config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;
                yield usersRepository.update(userDetails.id, {
                    acc_verify_code: accVerificationCode,
                });
                // send account verification mail
                const mailActiveParams = {
                    to: userDetails.email,
                    templateId: config_1.config.mailtemplate.accverifymail,
                    dynamicTemplateData: {
                        customerName: (0, publicService_1.getFullName)(userDetails.first_name, userDetails.last_name),
                        verificationLink: verificationLink,
                    },
                };
                (0, sendGridMailService_1.sendMailTemplate)(mailActiveParams);
                return res.send({
                    data: userDetails,
                    message: 'Thank you for signing up! A verification email has been sent. Please verify your email to log in',
                });
            }
            catch (err) {
                return res.status(401).send({ message: 'Something went wrong' });
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)('/verify-email'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, routing_controllers_1.Post)('/create'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "post", null);
__decorate([
    (0, routing_controllers_1.Post)('/login'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, routing_controllers_1.Post)('/forgot-password'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, routing_controllers_1.Post)('/reset-password'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, routing_controllers_1.Get)('/logout'),
    __param(0, (0, routing_controllers_1.Req)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, routing_controllers_1.Post)('/google-login'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, routing_controllers_1.Put)('/old-set-password/:encstr/:uuid'),
    __param(0, (0, routing_controllers_1.Param)('encstr')),
    __param(1, (0, routing_controllers_1.Param)('uuid')),
    __param(2, (0, routing_controllers_1.Body)()),
    __param(3, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "oldsetNewPassword", null);
__decorate([
    (0, routing_controllers_1.Put)('/set-password/:encstr/:uuid'),
    __param(0, (0, routing_controllers_1.Param)('encstr')),
    __param(1, (0, routing_controllers_1.Param)('uuid')),
    __param(2, (0, routing_controllers_1.Body)()),
    __param(3, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setNewPassword", null);
__decorate([
    (0, routing_controllers_1.Post)('/send-activation-mail'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendActivationMail", null);
AuthController = __decorate([
    (0, routing_controllers_1.JsonController)('/auth')
], AuthController);
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map