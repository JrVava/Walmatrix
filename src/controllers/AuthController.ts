import {
    Body,
    Get,
    JsonController,
    Post,
    Req,
    Res,
    Put,
    Param,
} from 'routing-controllers';
import { DataSourceConnection } from '../connection';
import { Request, Response } from 'express';
import { fetchToken, generateToken } from '../service/jwt';
import { revokedTokens } from '../service/revokedTokens';
import Login from '../types/loginInterface';
import {
    createTenantSchema,
    generateVerificationCode,
    getCurrentDateTime,
    removeSpcialCharacters,
    validateEmail,
    encryptData,
    decryptData,
} from '../modules/utils';
import { config } from '../config';
import { sendEmail, sendMailTemplate } from '../service/sendGridMailService';
import { verifyCode } from '../service/googleService';
import { Users, StoreConfig } from '../entity/Index';
import ChangePassword from '../types/changePasswordInterface';
import { getFullName } from '../service/publicService';
import logger from '../service/logger';

@JsonController('/auth')
export class AuthController extends DataSourceConnection {
    // Create Seller
    @Post('/verify-email')
    async verifyEmail(@Body() user: Users, @Res() res: Response) {
        if (!validateEmail(user.email)) {
            return res.status(400).json({ message: 'Invalid email' });
        }
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);

        // Check if email already exists
        const emailExist = await usersRepository.findOne({
            where: [{ email: user.email }],
        });

        if (emailExist) {
            return res.status(400).json({ message: 'Email already exist' });
        } else {
            return res
                .status(200)
                .json({ message: 'Email available to create' });
        }
    }

    // Create Seller by Signup
    @Post('/create')
    async post(@Body() user: Users, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        if (!validateEmail(user.email)) {
            return res.status(401).json({ message: 'Invalid email' });
        }
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

        const userData = {
            ...user,
            store_name: fakeStoreName,
            password: generateVerificationCode(8),
        };
        if (config.userTypes.includes(user.user_type)) {
            try {
                // console.log("Hello from1", await usersRepository.save(user));
                if (await usersRepository.save(userData)) {
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
                    const getStore =
                        await storeConfigRepository.save(saveStoreConfig);

                    // Below line is for updating the store_name in user Table
                    await usersRepository.update(createdUser.id, {
                        store_name: schemaName,
                        store_id: getStore.id,
                    });

                    // Below Line is for creating a new Schema
                    await createTenantSchema(schemaName);

                    // Insert new user into new tenant user table
                    const tenatUsersRepo = (
                        await this.connection(schemaName)
                    ).getRepository(Users);
                    if (
                        await tenatUsersRepo.save({
                            ...user,
                            store_name: schemaName,
                            password: generateVerificationCode(8),
                        })
                    ) {
                        const getTenantUser = await tenatUsersRepo.findOne({
                            where: { email: user.email },
                        });

                        // create account verification link
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
                                'Send account verification mail on seller creation auth controller',
                            );
                        }

                        // Return new created user
                        return res.send({
                            data: getTenantUser,
                            message:
                                'Thank you for signing up! A verification email has been sent. Please verify your email to log in',
                        });
                    }
                }
            } catch (err) {
                return res.send(err);
            }
        } else {
            return res.status(401).json({ message: 'Invalid user type' });
        }
    }

    @Post('/login')
    async login(@Body() login: Login, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
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
            const usersRepository = publicConnection.getRepository(Users);

            // start: check for verification for seller and seller' user
            const userVerifiedDetails = await usersRepository.findOne({
                where: {
                    email: login.email,
                    is_deleted: false,
                    is_verified: false,
                },
            });
            if (
                userVerifiedDetails &&
                (userVerifiedDetails.user_type == 2 ||
                    userVerifiedDetails.user_type == 4) &&
                !userVerifiedDetails.is_verified
            ) {
                return res.status(401).json({
                    message:
                        "You haven't verify your account yet, first verify it. For more info please contact to support.",
                });
            }
            // end: check for verification for seller and seller' user
            const userDetails = await usersRepository.findOne({
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
            if (config.userTypes.includes(userDetails.user_type)) {
                const usersTenantRepository = (
                    await this.connection(userDetails.store_name)
                ).getRepository(Users);

                userTenantDetails = await usersTenantRepository.findOne({
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
            const token = generateToken(userDetails.email);

            // Check if the user's token has been revoked
            if (revokedTokens.includes(token)) {
                return res
                    .status(401)
                    .json({ message: 'Unauthorized request' });
            }
            return { data: userDetails, accessToken: token };
        } catch (error) {
            return res
                .status(401)
                .send({ message: 'Emails and password does not matched' });
        }
    }

    @Post('/forgot-password')
    async forgotPassword(
        @Body() forgotPassword: Partial<Login>,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        // Send forgot password mail to user
        // const emailTemplate = verifyEmailTamplate(otp);

        // Generate verify code
        const code = generateVerificationCode(32);
        const resetURL = `${config.frontend_url}reset-password?vc=${code}`;

        //set code to public user table and tenat user table
        const usersRepository = publicConnection.getRepository(Users);
        const userDetails = await usersRepository.findOne({
            where: {
                email: forgotPassword.email,
                is_deleted: false,
            },
        });

        if (userDetails) {
            // when user not verified
            if (!userDetails.is_verified) {
                return res.status(401).json({
                    message:
                        "You haven't verify your account yet,first verify it.for more info please contact to support",
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

            if (sendEmail(mailServiceParams)) {
                if (
                    (
                        await usersRepository.update(userDetails.id, {
                            verify_code: code,
                            verify_code_at: getCurrentDateTime(),
                        })
                    ).affected
                ) {
                    if (config.userTypes.includes(userDetails.user_type)) {
                        const usersTenantRepository = (
                            await this.connection(userDetails.store_name)
                        ).getRepository(Users);

                        const userTenantDetails =
                            await usersTenantRepository.findOne({
                                where: {
                                    email: forgotPassword.email,
                                    is_active: true,
                                    is_deleted: false,
                                },
                            });

                        if (userTenantDetails) {
                            if (
                                (
                                    await usersTenantRepository.update(
                                        userTenantDetails.id,
                                        {
                                            verify_code: code,
                                            verify_code_at:
                                                getCurrentDateTime(),
                                        },
                                    )
                                ).affected
                            ) {
                                return res.json({
                                    message:
                                        'Reset password email has been sent successfully',
                                });
                            }
                        }
                    } else {
                        return res.json({
                            message:
                                'Reset password email has been sent successfully',
                        });
                    }
                } else {
                    return res
                        .status(401)
                        .send({ message: 'Something went wrong' });
                }
            } else {
                return res
                    .status(401)
                    .send({ message: 'Maiil not sending, Please try again!' });
            }
        } else {
            return res.status(401).json({ message: 'Email does not exist' });
        }
    }

    @Post('/reset-password')
    async resetPassword(
        @Body() resetPassword: Partial<Login>,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        // Verify code for reset password request
        try {
            // Check user exists to public.users table
            const usersRepository = publicConnection.getRepository(Users);
            const userDetails = await usersRepository.findOne({
                where: {
                    verify_code: resetPassword.verify_code,
                    is_active: true,
                    is_deleted: false,
                },
            });

            if (!userDetails) {
                return res.status(401).json({ message: 'Invalid verify code' });
            }

            if (
                (
                    await usersRepository.update(userDetails.id, {
                        password: resetPassword.password,
                        verify_code: null,
                    })
                ).affected
            ) {
                // Check user exists to tenant.users table
                if (config.userTypes.includes(userDetails.user_type)) {
                    const usersTenantRepository = (
                        await this.connection(userDetails.store_name)
                    ).getRepository(Users);

                    const userTenantDetails =
                        await usersTenantRepository.findOne({
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

                    if (
                        (
                            await usersTenantRepository.update(
                                userTenantDetails.id,
                                {
                                    password: resetPassword.password,
                                    verify_code: null,
                                },
                            )
                        ).affected
                    ) {
                        // success for seller tenent user
                    } else {
                        return res
                            .status(401)
                            .send({ message: 'Something went wrong' });
                    }
                }

                return res.json({
                    message: 'Reset password has been successfully',
                });
            } else {
                return res
                    .status(401)
                    .send({ message: 'Something went wrong' });
            }
        } catch (error) {
            return res.status(401).send({ message: 'Something went wrong' });
        }
    }

    @Get('/logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        // Handle logout logic here
        const token = fetchToken(req.headers);

        if (!token) {
            return res.status(401).send({ message: 'No token provided' });
        }

        revokedTokens.push(token); // Revoke the token

        return res.json({ message: 'Logout successfully' });
    }

    @Post('/google-login')
    async googleLogin(@Body() login: Partial<Login>, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        try {
            // Get the code from the query
            if (!login.google_access_token) {
                return res
                    .status(401)
                    .json({ message: 'Authorization code not provided!' });
            }

            const payload = await verifyCode(login.google_access_token);

            // Check if email is verified
            if (!payload && payload.email_verified) {
                return res
                    .status(403)
                    .json({ message: 'Google account not verified' });
            }

            const usersRepository = publicConnection.getRepository(Users);
            const userDetails = await usersRepository.findOne({
                where: {
                    email: payload.email,
                    is_deleted: false,
                },
            });

            let createdUser: Users;
            let getCreatedUser: Users;

            // Create  user if user already not exist
            if (!userDetails) {
                // return res
                //         .status(401)
                //         .json({ message: "Sorry, User doesn't exist." });
                const fakeStoreName = removeSpcialCharacters(
                    payload.email.toLowerCase().split('@')[0],
                );

                const user: Partial<Users> = {
                    first_name: payload.given_name,
                    last_name: payload.family_name,
                    email: payload.email,
                    password: generateVerificationCode(8), // Generate random password
                    user_type: 2, // By default create a new seller account
                    is_user_sso: true,
                };

                const userData = { ...user, store_name: fakeStoreName };

                // Check user is seller(user_type), If yes then create tenant with store_name as tenant_name
                if (config.userTypes.includes(user.user_type)) {
                    try {
                        if (await usersRepository.save(userData)) {
                            createdUser = await usersRepository.findOne({
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
                            const getStore =
                                await storeConfigRepository.save(
                                    saveStoreConfig,
                                );

                            // Below line is for updating the store_name in user Table
                            await usersRepository.update(createdUser.id, {
                                store_name: schemaName,
                                store_id: getStore.id,
                            });

                            // Create tenant
                            await createTenantSchema(schemaName);

                            // Insert new user into new tenant user table
                            const tenatUsersRepo = (
                                await this.connection(schemaName)
                            ).getRepository(Users);
                            if (await tenatUsersRepo.save(userData)) {
                                await tenatUsersRepo.findOne({
                                    where: { email: user.email },
                                });

                                // send welcome mail
                                const mailServiceParams = {
                                    to: createdUser.email,
                                    templateId: config.mailtemplate.welcomemail,
                                    dynamicTemplateData: {
                                        customerName: getFullName(
                                            createdUser.first_name,
                                            createdUser.last_name,
                                        ),
                                    },
                                };

                                sendMailTemplate(mailServiceParams);
                            }

                            getCreatedUser = await usersRepository.findOne({
                                where: { email: user.email },
                            });
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
            // Sign JWT , valid for 1 hour
            const token = generateToken(payload.email);

            // Check if the user's token has been revoked
            if (revokedTokens.includes(token)) {
                return res
                    .status(401)
                    .json({ message: 'Unauthorized request' });
            }

            return res.status(200).json({
                data: userDetails ? userDetails : getCreatedUser,
                accessToken: token,
            });
        } catch (err) {
            return res
                .status(401)
                .json({ message: 'Failed to authorize Google User' });
        }
    }

    @Put('/old-set-password/:encstr/:uuid')
    async oldsetNewPassword(
        @Param('encstr') encstr: string,
        @Param('uuid') uuid: string,
        @Body() changePassword: ChangePassword,
        @Res() res: Response,
    ) {
        try {
            const userId = parseInt(decryptData(encstr));
            const { new_password } = changePassword;

            // check for user exits and links verification.
            const usersRepository = (
                await this.publicConnection()
            ).getRepository(Users);
            const getUser = await usersRepository.findOne({
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
            await usersRepository.update(
                { id: userId },
                { password: new_password.trim(), is_verified: true },
            );
            const userDetails = await usersRepository.findOne({
                where: { id: userId },
            });

            const tenatUsersRepo = (
                await this.connection(userDetails.store_name)
            ).getRepository(Users);

            const userTenatDetails = await tenatUsersRepo.findOne({
                where: { email: userDetails.email },
            });

            if (userTenatDetails) {
                await tenatUsersRepo.update(
                    { email: userDetails.email },
                    { password: new_password.trim(), is_verified: true },
                );
                // send welcome mail
                const mailServiceParams = {
                    to: userDetails.email,
                    templateId: config.mailtemplate.welcomemail,
                    dynamicTemplateData: {
                        customerName: getFullName(
                            userDetails.first_name,
                            userDetails.last_name,
                        ),
                    },
                };
                sendMailTemplate(mailServiceParams);
            }

            return res.status(200).send({
                data: userDetails,
                message: 'New password has been update successfully',
            });
        } catch (err) {
            return res.status(401).send({ message: 'Something went wrong' });
        }
    }
    @Put('/set-password/:encstr/:uuid')
    async setNewPassword(
        @Param('encstr') encstr: string,
        @Param('uuid') uuid: string,
        @Body() changePassword: ChangePassword,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const { new_password } = changePassword;
        const usersRepository = publicConnection.getRepository(Users);
        const getUser = await usersRepository.findOne({
            where: { acc_verify_code: uuid },
        });
        if (getUser.is_verified) {
            return res
                .status(404)
                .send({ message: 'You are already verified' });
        }
        if (getUser) {
            await usersRepository.update(
                { id: getUser.id },
                { password: new_password, is_verified: true },
            );
            const tenatUsersRepo = (
                await this.connection(getUser.store_name)
            ).getRepository(Users);
            const userTenatDetails = await tenatUsersRepo.findOne({
                where: { email: getUser.email },
            });
            if (userTenatDetails) {
                await tenatUsersRepo.update(
                    { email: getUser.email },
                    { password: new_password, is_verified: true },
                );
                // send welcome mail
                const mailServiceParams = {
                    to: getUser.email,
                    templateId: config.mailtemplate.welcomemail,
                    dynamicTemplateData: {
                        customerName: getFullName(
                            getUser.first_name,
                            getUser.last_name,
                        ),
                    },
                };
                sendMailTemplate(mailServiceParams);
            }
            return res
                .status(200)
                .send({ message: 'New password has been update successfully' });
        }
        return res.status(404).send({ message: 'User not found' });
    }

    @Post('/send-activation-mail')
    async sendActivationMail(
        @Body() changePasswordObj: ChangePassword,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        try {
            const { email } = changePasswordObj;
            const usersRepository = publicConnection.getRepository(Users);
            const userDetails = await usersRepository.findOne({
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
            const encyptedString = encryptData(userDetails.id.toString());
            const accVerificationCode = generateVerificationCode(32);
            const verificationLink = `${config.frontend_url}verify-account?id=${encyptedString}&avc=${accVerificationCode}`;
            await usersRepository.update(userDetails.id, {
                acc_verify_code: accVerificationCode,
            });

            // send account verification mail
            const mailActiveParams = {
                to: userDetails.email,
                templateId: config.mailtemplate.accverifymail,
                dynamicTemplateData: {
                    customerName: getFullName(
                        userDetails.first_name,
                        userDetails.last_name,
                    ),
                    verificationLink: verificationLink,
                },
            };
            sendMailTemplate(mailActiveParams);
            return res.send({
                data: userDetails,
                message:
                    'Thank you for signing up! A verification email has been sent. Please verify your email to log in',
            });
        } catch (err) {
            return res.status(401).send({ message: 'Something went wrong' });
        }
    }
}
