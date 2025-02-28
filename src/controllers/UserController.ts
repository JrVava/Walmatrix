import {
    Param,
    Get,
    Post,
    Put,
    Delete,
    Res,
    UseBefore,
    JsonController,
    Body,
    Req,
    UploadedFile,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { loggingMiddleware } from '../service/loggingMiddleware';
import {
    createTenantSchema,
    removeSpcialCharacters,
    validateEmail,
    fileUploadOptions,
    generateVerificationCode,
    encryptData,
} from '../modules/utils';
import ChangePassword from '../types/changePasswordInterface';
import { sendMailTemplate } from '../service/sendGridMailService';
import { config } from '../config';
import UsersUpdate from '../types/updateUser';
// import { WallmartClients } from "../modules/WallmartClients";
import { DataSourceConnection } from '../connection';
import UpdateSellerUser from '../types/updateSellerUserInterface';
import { Users, StoreConfig, StripePlans } from '../entity/Index';
import logger from '../service/logger';
import { getFullName } from '../service/publicService';
@JsonController('/users')
@UseBefore(loggingMiddleware)
export class UserController extends DataSourceConnection {
    // Seller List
    @Get('/')
    async index() {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        return await usersRepository
            .createQueryBuilder('users')
            .select('users.*', 'users')
            .where('users.user_type = :usertype', { usertype: 2 })
            .andWhere('users.is_deleted = :delete', { delete: false })
            .getRawMany();
    }

    @Get('/view/:id')
    async getOne(@Param('id') id: number, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const data = await usersRepository.findOne({
            where: { id, user_type: 2, is_deleted: false },
        });

        if (!data) {
            return res.status(200).json({ message: 'No data avaialble' });
        }
        return data;
    }

    @Put('/update/:id')
    async updateSeller(
        @Param('id') id: number,
        @Body() user: Partial<UsersUpdate>,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        //fetch emails from header
        const publicConnection = await this.publicConnection();
        if (req.header('store_name')) {
            const userRepo = publicConnection.getRepository(Users);
            // check user is exist or not
            const userExist = await userRepo.findOne({
                where: { id, email: user.email },
            });

            if (userExist) {
                const userData: Partial<Users> = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    is_active: user.is_active,
                    phone: user.phone,
                    company_name: user.company_name,
                    stripe_customer_id: user.stripe_customer_id,
                };

                if ((await userRepo.update(id, userData)).affected) {
                    const userTenantRepo = (
                        await this.connection(userExist.store_name)
                    ).getRepository(Users);
                    const getTenantUser = await userTenantRepo.findOne({
                        where: { email: userExist.email },
                    });
                    if (getTenantUser) {
                        try {
                            (
                                await userTenantRepo.update(
                                    getTenantUser.id,
                                    userData,
                                )
                            ).affected; // update in tenant
                        } catch (error) {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }

                        const updatedUser = await userRepo
                            .createQueryBuilder('users')
                            .select('users.*', 'users')
                            .addSelect('userSettings.client_id', 'client_id')
                            .addSelect(
                                'userSettings.client_secret',
                                'client_secret',
                            )
                            .addSelect(
                                'userSettings.is_connected',
                                'is_connected',
                            )
                            .leftJoin('users.usersSettings', 'userSettings')
                            .where('users.id = :id', { id: userExist.id })
                            .getRawOne();

                        return res.status(200).json({
                            data: updatedUser,
                            message: 'User has been updated successfully',
                        });
                    } else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                } else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            } else {
                return res.status(200).json({
                    message: `Sorry, This email id - ${user.email} does not exist`,
                });
            }
        }
    }

    // Create Seller
    @Post('/create')
    async createSeller(@Body() user: Users, @Res() res: Response) {
        if (!validateEmail(user.email)) {
            return res.status(401).json({ message: 'Invalid email' });
        }
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);

        // Check if user already exists
        const emailExist = await usersRepository.findOne({
            where: [{ email: user.email }],
        });

        if (emailExist) {
            return res.status(401).json({ message: 'Email already exist' });
        }

        const fakeStoreName = removeSpcialCharacters(
            user.email.toLowerCase().split('@')[0],
        );
        const userData = { ...user, store_name: fakeStoreName };

        await usersRepository.save(userData); //store in public

        // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
        if (user.user_type == 2) {
            try {
                const createdUser = await usersRepository.findOne({
                    where: { email: user.email },
                });

                const storeConfigRepository =
                    publicConnection.getRepository(StoreConfig);
                // Below code is for add new store config
                const schemaName = `default_${createdUser.id}`;
                const storeConfig: Partial<StoreConfig> = {
                    user_id: createdUser.id,
                    store_name: schemaName,
                    name: 'Default',
                };
                // Here store config is saved
                const saveStoreConfig =
                    storeConfigRepository.create(storeConfig);
                await storeConfigRepository.save(saveStoreConfig);

                //find store id
                const getStoreDetais = await storeConfigRepository.findOne({
                    where: { user_id: createdUser.id },
                });

                // Below line is for updating the store_name in user Table
                await usersRepository.update(createdUser.id, {
                    store_name: schemaName,
                    store_id: getStoreDetais.id,
                });

                // Create tenant
                await createTenantSchema(schemaName);

                const tenatUsersRepo = (
                    await this.connection(schemaName)
                ).getRepository(Users);

                const userDataTenat = {
                    ...user,
                    store_name: schemaName,
                    password: generateVerificationCode(8),
                };
                const savedUsers = await tenatUsersRepo.save(userDataTenat);
                // Insert new user into new tenant user table
                if (savedUsers) {
                    // create account verification link
                    const encyptedString = encryptData(
                        createdUser.id.toString(),
                    );
                    const accVerificationCode = generateVerificationCode(32);
                    const verificationLink = `${config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;
                    if (
                        await usersRepository.update(createdUser.id, {
                            acc_verify_code: accVerificationCode,
                        })
                    ) {
                        // send account verification mail
                        const mailActiveParams = {
                            to: user.email,
                            templateId: config.mailtemplate.accverifymail,
                            dynamicTemplateData: {
                                customerName: getFullName(
                                    user.first_name,
                                    user.last_name,
                                ),
                                verificationLink: verificationLink,
                            },
                        };
                        sendMailTemplate(mailActiveParams);
                        logger.info(
                            'Send account verification mail on seller creation',
                        );
                    }
                    return res.send({
                        data: createdUser,
                        message: 'Seller user has been created successfully',
                    });
                }
            } catch (err) {
                return res.send(err);
            }
        } else if (user.user_type == 1) {
            const getTenantUser = await usersRepository.findOne({
                where: { email: user.email },
            });
            // send welcome mail
            const mailServiceParams = {
                to: user.email,
                templateId: config.mailtemplate.welcomemail,
                dynamicTemplateData: {
                    customerName: getFullName(user.first_name, user.last_name),
                },
            };

            sendMailTemplate(mailServiceParams);
            return res.send({
                data: getTenantUser,
                message: 'Seller adin has been created successfully',
            });
        } else {
            return res
                .status(401)
                .json({ message: 'Invalid user type or store name' });
        }
    }

    // Create seller's user for seller and super admin
    @Post('/old-seller/create')
    async oldcreateSellerUser(@Body() user: Users, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);

        // Check if user already exists
        const emailExist = await usersRepository.findOne({
            where: [{ email: user.email }],
        });

        if (emailExist) {
            return res.status(401).json({ message: 'Email ID already exist' });
        }

        const getStoreDetails = await storeConfigRepository.findOne({
            where: { store_name: user.store_name },
        });
        // Insert new user into new tenant user table
        user = { ...user, store_id: getStoreDetails.id };

        // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
        if (user.user_type == 4 && user.store_name) {
            try {
                const storeUserData: Partial<Users> = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    store_name: user.store_name,
                    phone: user.phone,
                    store_id: user.store_id,
                    password: Math.floor(Math.random() * 10000000).toString(36), //user.password,
                    user_type: user.user_type,
                };
                if (await usersRepository.save(storeUserData)) {
                    const tenatUsersRepo = (
                        await this.connection(user.store_name)
                    ).getRepository(Users);
                    if (await tenatUsersRepo.save(storeUserData)) {
                        // create account verification link
                        const createdUser = await usersRepository.findOne({
                            where: { email: user.email },
                        });
                        const encyptedString = encryptData(
                            createdUser.id.toString(),
                        );
                        const accVerificationCode =
                            generateVerificationCode(32);
                        const verificationLink = `${config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;

                        if (
                            await usersRepository.update(createdUser.id, {
                                acc_verify_code: accVerificationCode,
                            })
                        ) {
                            // send account verification mail
                            const mailActiveParams = {
                                to: createdUser.email,
                                templateId: config.mailtemplate.accverifymail,
                                dynamicTemplateData: {
                                    customerName: getFullName(
                                        createdUser.first_name,
                                        createdUser.last_name,
                                    ),
                                    verificationLink: verificationLink,
                                },
                            };
                            sendMailTemplate(mailActiveParams);
                            logger.info(
                                'Send account verification mail on seller user creation',
                            );
                        }
                        return res.send({
                            data: createdUser,
                            message:
                                'Seller user has been created successfully.',
                        });
                    }
                }
            } catch (err) {
                return res.send(err);
            }
        } else {
            return res
                .status(401)
                .json({ message: 'Invalid user type or store name' });
        }
    }

    @Post('/seller/create')
    async createSellerUser(
        @Body() user: Users,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        user = { ...user, acc_verify_code: generateVerificationCode(32) };
        const publicConnection = await this.publicConnection();
        const stripeObj = JSON.parse(req.header('stripe'));
        const {
            email,
            first_name,
            is_active,
            last_name,
            phone,
            store_name,
            user_type,
            acc_verify_code,
        } = user;

        const usersRepository = publicConnection.getRepository(Users);

        const storeConfigRepository =
            publicConnection.getRepository(StoreConfig);

        if (config.userTypes.includes(parseInt(user_type.toString()))) {
            const userExist = await usersRepository.findOne({
                where: { email: email },
            });

            if (userExist) {
                return res
                    .status(401)
                    .json({ message: 'Sorry, Email ID already exist' });
            }

            const countUser = await usersRepository.count({
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

            const storeExist = await storeConfigRepository.findOne({
                where: { store_name: store_name },
            });

            const tenatUsersRepo = (
                await this.connection(store_name)
            ).getRepository(Users);
            const checkTenantuser = await tenatUsersRepo.findOne({
                where: { email: email },
            });
            if (checkTenantuser) {
                return res.status(401).json({
                    message: `Sorry, This email ID is already exist.`,
                });
            }

            if (storeExist) {
                const userData: Partial<Users> = {
                    first_name: first_name,
                    last_name: last_name,
                    email: email,
                    store_name: store_name,
                    phone: phone,
                    store_id: storeExist.id,
                    password: Math.floor(Math.random() * 10000000).toString(36), //user.password,
                    user_type: user_type,
                    is_active: is_active,
                    acc_verify_code: acc_verify_code,
                };
                const saveUserData = await usersRepository.save(userData);
                if (saveUserData) {
                    const tenantSave = await tenatUsersRepo.save(saveUserData);
                    const encyptedString = encryptData(
                        tenantSave.id.toString(),
                    );
                    const verificationLink = `${config.frontend_url}verify-account?id=${encyptedString}&avc=${acc_verify_code}`;

                    const mailActiveParams = {
                        to: email,
                        templateId: config.mailtemplate.accverifymail,
                        dynamicTemplateData: {
                            customerName: getFullName(first_name, last_name),
                            verificationLink: verificationLink,
                        },
                    };
                    sendMailTemplate(mailActiveParams);
                    logger.info(
                        'Send account verification mail on seller user creation',
                    );
                    return res.send({
                        data: tenantSave,
                        message: `Seller user has been created successfully. Please check email id ${email} for verify the user.`,
                    });
                }
            } else {
                return res.status(401).json({
                    message: `Sorry, Store ${store_name} doesn't exist.`,
                });
            }
        } else {
            return res
                .status(401)
                .json({ message: `Sorry, invalid user type.` });
        }
    }

    // Update seller's user for seller and super admin
    @Put('/seller/update/:id')
    async updateSellerUser(
        @Param('id') id: number,
        @Body() user: Partial<UpdateSellerUser>,
        @Res() res: Response,
    ) {
        //fetch emails from header
        const publicConnection = await this.publicConnection();
        if (user.store_name) {
            const userTenatRepo = (
                await this.connection(user.store_name)
            ).getRepository(Users);

            // check user is exist or not
            const userTenantExist = await userTenatRepo.findOne({
                where: { id },
            });

            if (userTenantExist) {
                const userData: Partial<Users> = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    is_active: user.is_active,
                    phone: user.phone,
                    user_type: user.user_type,
                };
                if ((await userTenatRepo.update(id, userData)).affected) {
                    const userRepo = publicConnection.getRepository(Users);
                    const getUser = await userRepo.findOne({
                        where: { email: userTenantExist.email },
                    });
                    if (getUser) {
                        try {
                            (
                                await userRepo.update(
                                    { id: getUser.id },
                                    userData,
                                )
                            ).affected; // update in public
                        } catch (error) {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }

                        const updatedTenantUser = await userTenatRepo.findOne({
                            where: { email: userTenantExist.email },
                        });
                        return res.status(200).json({
                            data: updatedTenantUser,
                            message:
                                "Seller's user has been updated successfully",
                        });
                    }
                } else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            } else {
                return res
                    .status(500)
                    .json({ message: `Seller user id does not exist` });
            }
        }
    }

    // Delete seller's user for super admin
    @Delete('/seller/delete/:id/:store_name')
    async deleteSellerUser(
        @Param('id') id: number,
        @Param('store_name') store_name: string,
        @Res() res: Response,
    ) {
        //fetch emails from header
        const publicConnection = await this.publicConnection();
        if (store_name) {
            const userTenantRepo = (
                await this.connection(store_name)
            ).getRepository(Users);

            // check user is exist or not
            const userExist = await userTenantRepo.findOne({ where: { id } });

            if (userExist) {
                if (
                    (await userTenantRepo.update(id, { is_deleted: true }))
                        .affected
                ) {
                    const updatedUser = await userTenantRepo.findOne({
                        where: { id },
                    });

                    // update to public schema
                    const userRepo = publicConnection.getRepository(Users);
                    // get public tenant user
                    const userPublicExist = await userRepo.findOne({
                        where: { email: updatedUser.email },
                    });

                    if (userPublicExist) {
                        if (
                            (
                                await userRepo.update(userPublicExist.id, {
                                    is_deleted: true,
                                })
                            ).affected
                        ) {
                            return res.status(200).json({
                                data: updatedUser,
                                message: 'User has been deleted successfully',
                            });
                        } else {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }
                    }
                } else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            } else {
                return res
                    .status(500)
                    .json({ message: `User ID does not exist` });
            }
        }
    }

    @Delete('/delete/:id')
    async deleteUser(
        @Param('id') id: number,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        //fetch emails from header
        const publicConnection = await this.publicConnection();
        if (req.header('store_name')) {
            const storeName = req.header('store_name').toString();

            const userTenantRepo = (
                await this.connection(storeName)
            ).getRepository(Users);

            // check user is exist or not
            const userExist = await userTenantRepo.findOne({ where: { id } });

            if (userExist) {
                if (
                    (await userTenantRepo.update(id, { is_deleted: true }))
                        .affected
                ) {
                    const updatedUser = await userTenantRepo.findOne({
                        where: { id },
                    });

                    // update to public schema
                    const userRepo = publicConnection.getRepository(Users);
                    // get public tenant user
                    const userPublicExist = await userRepo.findOne({
                        where: { email: updatedUser.email },
                    });

                    if (userPublicExist) {
                        if (
                            (
                                await userRepo.update(userPublicExist.id, {
                                    is_deleted: true,
                                })
                            ).affected
                        ) {
                            return res.status(200).json({
                                data: updatedUser,
                                message: 'User has been deleted successfully',
                            });
                        } else {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }
                    }
                } else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            } else {
                return res
                    .status(500)
                    .json({ message: `User ID does not exist` });
            }
        }
    }

    @Put('/old-change-password/:id')
    async oldChangePassword(
        @Param('id') id: number,
        @Body() changePassword: ChangePassword,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        const publicConnection = await this.publicConnection();
        if (!changePassword.old_password || !changePassword.new_password) {
            return res.status(401).json({
                message: 'Old password or new password should not be empty',
            });
        }

        const storeName = String(req.header('store_name'));
        const email = String(req.header('email'));
        const userRepo = publicConnection.getRepository(Users);
        const getUserInPublic = userRepo.findOne({
            where: { email: email, password: changePassword.old_password },
        });
        if (storeName == 'public') {
            const userExist = await Promise.all([getUserInPublic]);

            if (userExist) {
                const updateUser = await userRepo.update(
                    { email: email },
                    { password: changePassword.new_password },
                );

                if (updateUser) {
                    const getUserInTenant = await userRepo.findOne({
                        where: { email: email },
                    });

                    return res.status(200).json({
                        data: getUserInTenant,
                        message: 'Password has been changed successfully',
                    });
                }
            } else {
                return res
                    .status(401)
                    .json({ message: 'Old password does not matched' });
            }
        } else {
            const userTenantRepo = (
                await this.connection(storeName)
            ).getRepository(Users);

            const getUserInTenant = userTenantRepo.findOne({
                where: { email: email, password: changePassword.old_password },
            });

            const [userExistInTenant, userExistPublic] = await Promise.all([
                getUserInTenant,
                getUserInPublic,
            ]);

            if (userExistInTenant && userExistPublic) {
                const updateInTenant = userTenantRepo.update(
                    { email: email },
                    { password: changePassword.new_password },
                ); //Prmoise<pendin>

                const updateInPublic = userRepo.update(
                    { email: email },
                    { password: changePassword.new_password },
                );

                const [updatedInPublic, updatedInTenant] = await Promise.all([
                    updateInPublic,
                    updateInTenant,
                ]);

                if (updatedInPublic.affected && updatedInTenant.affected) {
                    const getUserInTenant = await userTenantRepo.findOne({
                        where: { email: email },
                    });

                    return res.status(200).json({
                        data: getUserInTenant,
                        message: 'Password has been changed successfully',
                    });
                }
            } else {
                return res
                    .status(401)
                    .json({ message: 'Old password does not matched' });
            }
        }
    }

    @Put('/change-password/:id')
    async changePassword(
        @Param('id') id: number,
        @Body() changePassword: ChangePassword,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        const publicConnection = await this.publicConnection();
        if (!changePassword.old_password || !changePassword.new_password) {
            return res.status(401).json({
                message: 'Old password or new password should not be empty',
            });
        }
        const storeName = String(req.header('store_name'));

        const userRepo = publicConnection.getRepository(Users);
        const getUserInPublic = await userRepo.findOne({
            where: { id: id, password: changePassword.old_password },
        });

        if (getUserInPublic) {
            const updateUser = await userRepo.update(
                { id: id },
                { password: changePassword.new_password },
            );

            if (updateUser) {
                const userTenantRepo = (
                    await this.connection(storeName)
                ).getRepository(Users);

                const getUserInTenant = userTenantRepo.findOne({
                    where: { id: id, password: changePassword.old_password },
                });

                if (getUserInTenant) {
                    userTenantRepo.update(
                        { email: getUserInPublic.email },
                        { password: changePassword.new_password },
                    );
                }

                return res.status(200).json({
                    data: getUserInPublic,
                    message: 'Password has been changed successfully',
                });
            }
        } else {
            return res
                .status(401)
                .json({ message: 'Old password does not matched' });
        }
        return { message: storeName };
    }
    // Seller user list
    @Get('/seller/user-list/:id')
    async sellerUserList(
        @Param('id') id: number,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const getUsersData = await usersRepository.findOne({
            where: { id: id },
        });

        const loggedInUser = req.headers['email'];
        if (getUsersData) {
            const usersTenantRepo = (
                await this.connection(getUsersData.store_name)
            ).getRepository(Users);
            const getTenanrUsers = await usersTenantRepo
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
            } else {
                return res
                    .status(401)
                    .json({ message: `Users data not found` });
            }
        } else {
            return res.status(401).json({ message: `Users does not exists` });
        }
    }

    @Get('/user/:id')
    async getUser(@Param('id') id: number, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const getUser = await usersRepository.findOne({
            where: { id: id },
            relations: ['usersSettings', 'stripeSubscriptions'],
        });
        let planDetails = null;
        if (getUser) {
            if (getUser.stripeSubscriptions) {
                const planRepository =
                    publicConnection.getRepository(StripePlans);
                planDetails = await planRepository.findOne({
                    where: {
                        stripe_price_id:
                            getUser.stripeSubscriptions.stripe_price_id,
                    },
                });
            }
            getUser['stripePlanDetails'] = planDetails;
            return res.status(200).send({ data: getUser });
        } else {
            return res.status(404).send({ message: 'User not found' });
        }
    }

    @Post('/upload-profile-image')
    async uploadProfileImage(
        @UploadedFile('profile', { options: fileUploadOptions }) file: any,
        @Body() user: Users,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        // console.log('Successfully uploaded ' + s3Storage + ' files!');
        // return {}
        const imageName = file.location; //file.path.replace('//', '/');
        if (req.header('store_name')) {
            const publicConnection = await this.publicConnection();
            const usersRepo = publicConnection.getRepository(Users);
            const userExist = await usersRepo.findOne({
                where: { id: user.id },
            });

            if (userExist) {
                const userData: Partial<Users> = { profile: imageName };
                if ((await usersRepo.update(user.id, userData)).affected) {
                    const userTenantRepo = (
                        await this.connection(userExist.store_name)
                    ).getRepository(Users);
                    const getTenantUser = await userTenantRepo.findOne({
                        where: { email: userExist.email },
                    });
                    if (getTenantUser) {
                        try {
                            (
                                await userTenantRepo.update(
                                    getTenantUser.id,
                                    userData,
                                )
                            ).affected; // update in tenant
                        } catch (error) {
                            return res
                                .status(500)
                                .json({ message: 'Something went wrong' });
                        }

                        const updatedUser = await usersRepo.findOne({
                            where: { id: user.id },
                        });
                        return res.status(200).json({
                            data: updatedUser,
                            message: 'User has been updated successfully',
                        });
                    } else {
                        return res
                            .status(500)
                            .json({ message: 'Something went wrong' });
                    }
                } else {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                }
            } else {
                return res
                    .status(200)
                    .json({ message: `${user.id} User ID does not exist` });
            }
        }
    }
}
