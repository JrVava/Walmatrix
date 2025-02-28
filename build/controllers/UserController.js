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
exports.UserController = void 0;
const routing_controllers_1 = require("routing-controllers");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const utils_1 = require("../modules/utils");
const sendGridMailService_1 = require("../service/sendGridMailService");
const config_1 = require("../config");
// import { WallmartClients } from "../modules/WallmartClients";
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const logger_1 = __importDefault(require("../service/logger"));
const publicService_1 = require("../service/publicService");
let UserController = class UserController extends connection_1.DataSourceConnection {
    // Seller List
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            return yield usersRepository
                .createQueryBuilder('users')
                .select('users.*', 'users')
                .where('users.user_type = :usertype', { usertype: 2 })
                .andWhere('users.is_deleted = :delete', { delete: false })
                .getRawMany();
        });
    }
    getOne(id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const data = yield usersRepository.findOne({
                where: { id, user_type: 2, is_deleted: false },
            });
            if (!data) {
                return res.status(200).json({ message: 'No data avaialble' });
            }
            return data;
        });
    }
    updateSeller(id, user, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            //fetch emails from header
            if (req.header('store_name')) {
                const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                // check user is exist or not
                const userExist = yield userRepo.findOne({
                    where: { id, email: user.email },
                });
                if (userExist) {
                    const userData = {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        is_active: user.is_active,
                        phone: user.phone,
                        company_name: user.company_name,
                        stripe_customer_id: user.stripe_customer_id,
                    };
                    if ((yield userRepo.update(id, userData)).affected) {
                        const userTenantRepo = (yield this.connection(userExist.store_name)).getRepository(Index_1.Users);
                        const getTenantUser = yield userTenantRepo.findOne({
                            where: { email: userExist.email },
                        });
                        if (getTenantUser) {
                            try {
                                (yield userTenantRepo.update(getTenantUser.id, userData)).affected; // update in tenant
                            }
                            catch (error) {
                                return res
                                    .status(500)
                                    .json({ message: 'Something went wrong' });
                            }
                            const updatedUser = yield userRepo
                                .createQueryBuilder('users')
                                .select('users.*', 'users')
                                .addSelect('userSettings.client_id', 'client_id')
                                .addSelect('userSettings.client_secret', 'client_secret')
                                .addSelect('userSettings.is_connected', 'is_connected')
                                .leftJoin('users.usersSettings', 'userSettings')
                                .where('users.id = :id', { id: userExist.id })
                                .getRawOne();
                            return res.status(200).json({
                                data: updatedUser,
                                message: 'User has been updated successfully',
                            });
                        }
                        else {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res.status(200).json({
                        message: `Sorry, This email id - ${user.email} does not exist`,
                    });
                }
            }
        });
    }
    // Create Seller
    createSeller(user, res) {
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
            const userData = Object.assign(Object.assign({}, user), { store_name: fakeStoreName });
            yield usersRepository.save(userData); //store in public
            // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
            if (user.user_type == 2) {
                try {
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
                    yield storeConfigRepository.save(saveStoreConfig);
                    //find store id
                    const getStoreDetais = yield storeConfigRepository.findOne({
                        where: { user_id: createdUser.id },
                    });
                    // Below line is for updating the store_name in user Table
                    yield usersRepository.update(createdUser.id, {
                        store_name: schemaName,
                        store_id: getStoreDetais.id,
                    });
                    // Create tenant
                    yield (0, utils_1.createTenantSchema)(schemaName);
                    const tenatUsersRepo = (yield this.connection(schemaName)).getRepository(Index_1.Users);
                    const userDataTenat = Object.assign(Object.assign({}, user), { store_name: schemaName, password: (0, utils_1.generateVerificationCode)(8) });
                    const savedUsers = yield tenatUsersRepo.save(userDataTenat);
                    // Insert new user into new tenant user table
                    if (savedUsers) {
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
                            logger_1.default.info('Send account verification mail on seller creation');
                        }
                        return res.send({
                            data: createdUser,
                            message: 'Seller user has been created successfully',
                        });
                    }
                }
                catch (err) {
                    return res.send(err);
                }
            }
            else if (user.user_type == 1) {
                const getTenantUser = yield usersRepository.findOne({
                    where: { email: user.email },
                });
                // send welcome mail
                const mailServiceParams = {
                    to: user.email,
                    templateId: config_1.config.mailtemplate.welcomemail,
                    dynamicTemplateData: {
                        customerName: (0, publicService_1.getFullName)(user.first_name, user.last_name),
                    },
                };
                (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
                return res.send({
                    data: getTenantUser,
                    message: 'Seller adin has been created successfully',
                });
            }
            else {
                return res
                    .status(401)
                    .json({ message: 'Invalid user type or store name' });
            }
        });
    }
    // Create seller's user for seller and super admin
    oldcreateSellerUser(user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            // Check if user already exists
            const emailExist = yield usersRepository.findOne({
                where: [{ email: user.email }],
            });
            if (emailExist) {
                return res.status(401).json({ message: 'Email ID already exist' });
            }
            const getStoreDetails = yield storeConfigRepository.findOne({
                where: { store_name: user.store_name },
            });
            // Insert new user into new tenant user table
            user = Object.assign(Object.assign({}, user), { store_id: getStoreDetails.id });
            // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
            if (user.user_type == 4 && user.store_name) {
                try {
                    const storeUserData = {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        store_name: user.store_name,
                        phone: user.phone,
                        store_id: user.store_id,
                        password: Math.floor(Math.random() * 10000000).toString(36),
                        user_type: user.user_type,
                    };
                    if (yield usersRepository.save(storeUserData)) {
                        const tenatUsersRepo = (yield this.connection(user.store_name)).getRepository(Index_1.Users);
                        if (yield tenatUsersRepo.save(storeUserData)) {
                            // create account verification link
                            const createdUser = yield usersRepository.findOne({
                                where: { email: user.email },
                            });
                            const encyptedString = (0, utils_1.encryptData)(createdUser.id.toString());
                            const accVerificationCode = (0, utils_1.generateVerificationCode)(32);
                            const verificationLink = `${config_1.config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;
                            if (yield usersRepository.update(createdUser.id, {
                                acc_verify_code: accVerificationCode,
                            })) {
                                // send account verification mail
                                const mailActiveParams = {
                                    to: createdUser.email,
                                    templateId: config_1.config.mailtemplate.accverifymail,
                                    dynamicTemplateData: {
                                        customerName: (0, publicService_1.getFullName)(createdUser.first_name, createdUser.last_name),
                                        verificationLink: verificationLink,
                                    },
                                };
                                (0, sendGridMailService_1.sendMailTemplate)(mailActiveParams);
                                logger_1.default.info('Send account verification mail on seller user creation');
                            }
                            return res.send({
                                data: createdUser,
                                message: 'Seller user has been created successfully.',
                            });
                        }
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
        });
    }
    createSellerUser(user, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            user = Object.assign(Object.assign({}, user), { acc_verify_code: (0, utils_1.generateVerificationCode)(32) });
            const stripeObj = JSON.parse(req.header('stripe'));
            const { email, first_name, is_active, last_name, phone, store_name, user_type, acc_verify_code, } = user;
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const storeConfigRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            if (config_1.config.userTypes.includes(parseInt(user_type.toString()))) {
                const userExist = yield usersRepository.findOne({
                    where: { email: email },
                });
                if (userExist) {
                    return res
                        .status(401)
                        .json({ message: 'Sorry, Email ID already exist' });
                }
                const countUser = yield usersRepository.count({
                    where: {
                        store_name: store_name,
                        is_deleted: false,
                    },
                });
                if (stripeObj.no_of_users === 0) {
                    return res.status(401).json({
                        message: `Sorry, You don't have any existing plan. Please Purchase plan.`,
                    });
                }
                if (countUser >= stripeObj.no_of_users) {
                    return res.status(401).json({
                        message: `Sorry, You have excessed the limit. Please Upgrade your plan.`,
                    });
                }
                const storeExist = yield storeConfigRepository.findOne({
                    where: { store_name: store_name },
                });
                const tenatUsersRepo = (yield this.connection(store_name)).getRepository(Index_1.Users);
                const checkTenantuser = yield tenatUsersRepo.findOne({
                    where: { email: email },
                });
                if (checkTenantuser) {
                    return res.status(401).json({
                        message: `Sorry, This email ID is already exist.`,
                    });
                }
                if (storeExist) {
                    const userData = {
                        first_name: first_name,
                        last_name: last_name,
                        email: email,
                        store_name: store_name,
                        phone: phone,
                        store_id: storeExist.id,
                        password: Math.floor(Math.random() * 10000000).toString(36),
                        user_type: user_type,
                        is_active: is_active,
                        acc_verify_code: acc_verify_code,
                    };
                    const saveUserData = yield usersRepository.save(userData);
                    if (saveUserData) {
                        const tenantSave = yield tenatUsersRepo.save(saveUserData);
                        const encyptedString = (0, utils_1.encryptData)(tenantSave.id.toString());
                        const verificationLink = `${config_1.config.frontend_url}verify-account?id=${encyptedString}&avc=${acc_verify_code}`;
                        const mailActiveParams = {
                            to: email,
                            templateId: config_1.config.mailtemplate.accverifymail,
                            dynamicTemplateData: {
                                customerName: (0, publicService_1.getFullName)(first_name, last_name),
                                verificationLink: verificationLink,
                            },
                        };
                        (0, sendGridMailService_1.sendMailTemplate)(mailActiveParams);
                        logger_1.default.info('Send account verification mail on seller user creation');
                        return res.send({
                            data: tenantSave,
                            message: `Seller user has been created successfully. Please check email id ${email} for verify the user.`,
                        });
                    }
                }
                else {
                    return res.status(401).json({
                        message: `Sorry, Store ${store_name} doesn't exist.`,
                    });
                }
            }
            else {
                return res
                    .status(401)
                    .json({ message: `Sorry, invalid user type.` });
            }
        });
    }
    // Update seller's user for seller and super admin
    updateSellerUser(id, user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //fetch emails from header
            if (user.store_name) {
                const userTenatRepo = (yield this.connection(user.store_name)).getRepository(Index_1.Users);
                // check user is exist or not
                const userTenantExist = yield userTenatRepo.findOne({
                    where: { id },
                });
                if (userTenantExist) {
                    const userData = {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        is_active: user.is_active,
                        phone: user.phone,
                        user_type: user.user_type,
                    };
                    if ((yield userTenatRepo.update(id, userData)).affected) {
                        const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                        const getUser = yield userRepo.findOne({
                            where: { email: userTenantExist.email },
                        });
                        if (getUser) {
                            try {
                                (yield userRepo.update({ id: getUser.id }, userData)).affected; // update in public
                            }
                            catch (error) {
                                return res
                                    .status(500)
                                    .json({ message: 'Something went wrong' });
                            }
                            const updatedTenantUser = yield userTenatRepo.findOne({
                                where: { email: userTenantExist.email },
                            });
                            return res.status(200).json({
                                data: updatedTenantUser,
                                message: "Seller's user has been updated successfully",
                            });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res
                        .status(500)
                        .json({ message: `Seller user id does not exist` });
                }
            }
        });
    }
    // Delete seller's user for super admin
    deleteSellerUser(id, store_name, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //fetch emails from header
            if (store_name) {
                const userTenantRepo = (yield this.connection(store_name)).getRepository(Index_1.Users);
                // check user is exist or not
                const userExist = yield userTenantRepo.findOne({ where: { id } });
                if (userExist) {
                    if ((yield userTenantRepo.update(id, { is_deleted: true }))
                        .affected) {
                        const updatedUser = yield userTenantRepo.findOne({
                            where: { id },
                        });
                        // update to public schema
                        const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                        // get public tenant user
                        const userPublicExist = yield userRepo.findOne({
                            where: { email: updatedUser.email },
                        });
                        if (userPublicExist) {
                            if ((yield userRepo.update(userPublicExist.id, {
                                is_deleted: true,
                            })).affected) {
                                return res.status(200).json({
                                    data: updatedUser,
                                    message: 'User has been deleted successfully',
                                });
                            }
                            else {
                                return res
                                    .status(500)
                                    .json({ message: 'Something went wrong' });
                            }
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res
                        .status(500)
                        .json({ message: `User ID does not exist` });
                }
            }
        });
    }
    deleteUser(id, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            //fetch emails from header
            if (req.header('store_name')) {
                const storeName = req.header('store_name').toString();
                const userTenantRepo = (yield this.connection(storeName)).getRepository(Index_1.Users);
                // check user is exist or not
                const userExist = yield userTenantRepo.findOne({ where: { id } });
                if (userExist) {
                    if ((yield userTenantRepo.update(id, { is_deleted: true }))
                        .affected) {
                        const updatedUser = yield userTenantRepo.findOne({
                            where: { id },
                        });
                        // update to public schema
                        const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                        // get public tenant user
                        const userPublicExist = yield userRepo.findOne({
                            where: { email: updatedUser.email },
                        });
                        if (userPublicExist) {
                            if ((yield userRepo.update(userPublicExist.id, {
                                is_deleted: true,
                            })).affected) {
                                return res.status(200).json({
                                    data: updatedUser,
                                    message: 'User has been deleted successfully',
                                });
                            }
                            else {
                                return res
                                    .status(500)
                                    .json({ message: 'Something went wrong' });
                            }
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res
                        .status(500)
                        .json({ message: `User ID does not exist` });
                }
            }
        });
    }
    oldChangePassword(id, changePassword, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!changePassword.old_password || !changePassword.new_password) {
                return res.status(401).json({
                    message: 'Old password or new password should not be empty',
                });
            }
            const storeName = String(req.header('store_name'));
            const email = String(req.header('email'));
            const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUserInPublic = userRepo.findOne({
                where: { email: email, password: changePassword.old_password },
            });
            if (storeName == 'public') {
                const userExist = yield Promise.all([getUserInPublic]);
                if (userExist) {
                    const updateUser = yield userRepo.update({ email: email }, { password: changePassword.new_password });
                    if (updateUser) {
                        const getUserInTenant = yield userRepo.findOne({
                            where: { email: email },
                        });
                        return res.status(200).json({
                            data: getUserInTenant,
                            message: 'Password has been changed successfully',
                        });
                    }
                }
                else {
                    return res
                        .status(401)
                        .json({ message: 'Old password does not matched' });
                }
            }
            else {
                const userTenantRepo = (yield this.connection(storeName)).getRepository(Index_1.Users);
                const getUserInTenant = userTenantRepo.findOne({
                    where: { email: email, password: changePassword.old_password },
                });
                const [userExistInTenant, userExistPublic] = yield Promise.all([
                    getUserInTenant,
                    getUserInPublic,
                ]);
                if (userExistInTenant && userExistPublic) {
                    const updateInTenant = userTenantRepo.update({ email: email }, { password: changePassword.new_password }); //Prmoise<pendin>
                    const updateInPublic = userRepo.update({ email: email }, { password: changePassword.new_password });
                    const [updatedInPublic, updatedInTenant] = yield Promise.all([
                        updateInPublic,
                        updateInTenant,
                    ]);
                    if (updatedInPublic.affected && updatedInTenant.affected) {
                        const getUserInTenant = yield userTenantRepo.findOne({
                            where: { email: email },
                        });
                        return res.status(200).json({
                            data: getUserInTenant,
                            message: 'Password has been changed successfully',
                        });
                    }
                }
                else {
                    return res
                        .status(401)
                        .json({ message: 'Old password does not matched' });
                }
            }
        });
    }
    changePassword(id, changePassword, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!changePassword.old_password || !changePassword.new_password) {
                return res.status(401).json({
                    message: 'Old password or new password should not be empty',
                });
            }
            const storeName = String(req.header('store_name'));
            const userRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUserInPublic = yield userRepo.findOne({
                where: { id: id, password: changePassword.old_password },
            });
            if (getUserInPublic) {
                const updateUser = yield userRepo.update({ id: id }, { password: changePassword.new_password });
                if (updateUser) {
                    const userTenantRepo = (yield this.connection(storeName)).getRepository(Index_1.Users);
                    const getUserInTenant = userTenantRepo.findOne({
                        where: { id: id, password: changePassword.old_password },
                    });
                    if (getUserInTenant) {
                        userTenantRepo.update({ email: getUserInPublic.email }, { password: changePassword.new_password });
                    }
                    return res.status(200).json({
                        data: getUserInPublic,
                        message: 'Password has been changed successfully',
                    });
                }
            }
            else {
                return res
                    .status(401)
                    .json({ message: 'Old password does not matched' });
            }
            return { message: storeName };
        });
    }
    // Seller user list
    sellerUserList(id, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUsersData = yield usersRepository.findOne({
                where: { id: id },
            });
            const loggedInUser = req.headers['email'];
            if (getUsersData) {
                const usersTenantRepo = (yield this.connection(getUsersData.store_name)).getRepository(Index_1.Users);
                const getTenanrUsers = yield usersTenantRepo
                    .createQueryBuilder('users')
                    .select('users.*')
                    .where('users.user_type IN (:...user_type)', {
                    user_type: [2, 4],
                })
                    .andWhere('users.is_deleted = :is_deleted', {
                    is_deleted: false,
                })
                    .andWhere('users.email != :email', { email: loggedInUser })
                    .getRawMany();
                // find({
                //     where: { user_type: 4, is_deleted: false },
                // });
                if (getTenanrUsers) {
                    return res.status(200).json({ data: getTenanrUsers });
                }
                else {
                    return res
                        .status(401)
                        .json({ message: `Users data not found` });
                }
            }
            else {
                return res.status(401).json({ message: `Users does not exists` });
            }
        });
    }
    getUser(id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUser = yield usersRepository.findOne({
                where: { id: id },
                relations: ['usersSettings', 'stripeSubscriptions'],
            });
            let planDetails = null;
            if (getUser) {
                if (getUser.stripeSubscriptions) {
                    const planRepository = (yield this.publicConnection()).getRepository(Index_1.StripePlans);
                    planDetails = yield planRepository.findOne({
                        where: {
                            stripe_price_id: getUser.stripeSubscriptions.stripe_price_id,
                        },
                    });
                }
                getUser['stripePlanDetails'] = planDetails;
                return res.status(200).send({ data: getUser });
            }
            else {
                return res.status(404).send({ message: 'User not found' });
            }
        });
    }
    uploadProfileImage(file, user, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log('Successfully uploaded ' + s3Storage + ' files!');
            // return {}
            const imageName = file.location; //file.path.replace('//', '/');
            if (req.header('store_name')) {
                const usersRepo = (yield this.publicConnection()).getRepository(Index_1.Users);
                const userExist = yield usersRepo.findOne({
                    where: { id: user.id },
                });
                if (userExist) {
                    const userData = { profile: imageName };
                    if ((yield usersRepo.update(user.id, userData)).affected) {
                        const userTenantRepo = (yield this.connection(userExist.store_name)).getRepository(Index_1.Users);
                        const getTenantUser = yield userTenantRepo.findOne({
                            where: { email: userExist.email },
                        });
                        if (getTenantUser) {
                            try {
                                (yield userTenantRepo.update(getTenantUser.id, userData)).affected; // update in tenant
                            }
                            catch (error) {
                                return res
                                    .status(500)
                                    .json({ message: 'Something went wrong' });
                            }
                            const updatedUser = yield usersRepo.findOne({
                                where: { id: user.id },
                            });
                            return res.status(200).json({
                                data: updatedUser,
                                message: 'User has been updated successfully',
                            });
                        }
                        else {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }
                    }
                    else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                }
                else {
                    return res
                        .status(200)
                        .json({ message: `${user.id} User ID does not exist` });
                }
            }
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "index", null);
__decorate([
    (0, routing_controllers_1.Get)('/view/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getOne", null);
__decorate([
    (0, routing_controllers_1.Put)('/update/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __param(3, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateSeller", null);
__decorate([
    (0, routing_controllers_1.Post)('/create'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "createSeller", null);
__decorate([
    (0, routing_controllers_1.Post)('/old-seller/create'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "oldcreateSellerUser", null);
__decorate([
    (0, routing_controllers_1.Post)('/seller/create'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __param(2, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "createSellerUser", null);
__decorate([
    (0, routing_controllers_1.Put)('/seller/update/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateSellerUser", null);
__decorate([
    (0, routing_controllers_1.Delete)('/seller/delete/:id/:store_name'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Param)('store_name')),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteSellerUser", null);
__decorate([
    (0, routing_controllers_1.Delete)('/delete/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __param(2, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUser", null);
__decorate([
    (0, routing_controllers_1.Put)('/old-change-password/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __param(3, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "oldChangePassword", null);
__decorate([
    (0, routing_controllers_1.Put)('/change-password/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __param(3, (0, routing_controllers_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "changePassword", null);
__decorate([
    (0, routing_controllers_1.Get)('/seller/user-list/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Req)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "sellerUserList", null);
__decorate([
    (0, routing_controllers_1.Get)('/user/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUser", null);
__decorate([
    (0, routing_controllers_1.Post)('/upload-profile-image'),
    __param(0, (0, routing_controllers_1.UploadedFile)('profile', { options: utils_1.fileUploadOptions })),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Req)()),
    __param(3, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Index_1.Users, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadProfileImage", null);
UserController = __decorate([
    (0, routing_controllers_1.JsonController)('/users'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], UserController);
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map