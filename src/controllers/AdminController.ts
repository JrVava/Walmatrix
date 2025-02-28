import {
    Get,
    Post,
    Body,
    Param,
    Put,
    Res,
    Delete,
    UseBefore,
    JsonController,
    Req,
} from 'routing-controllers';
import { Users } from '../entity/Index';
import { DataSourceConnection } from '../connection';
import { Request, Response } from 'express';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Not } from 'typeorm';
import { sendMailTemplate } from '../service/sendGridMailService';
import { config } from '../config';
import { getFullName } from '../service/publicService';

@JsonController('/admin')
@UseBefore(loggingMiddleware)
export class AdminController extends DataSourceConnection {
    @Post('/create')
    async post(@Body() user: Users, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        user = { ...user, user_type: 1 }; //flag for supuer admin
        const usersRepository = publicConnection.getRepository(Users);

        // Check if user already exists
        const emailExist = await usersRepository.findOne({
            where: { email: user.email },
        });

        if (emailExist) {
            return res.status(409).json({ message: 'Email already exist' });
        }

        // send welcome mail with credentials
        const mailServiceParams = {
            to: user.email,
            templateId: config.mailtemplate.welcomemail,
            dynamicTemplateData: {
                customerName: getFullName(user.first_name, user.last_name),
            },
        };

        sendMailTemplate(mailServiceParams);
        return usersRepository.save(user);
    }

    @Get('/list')
    async list(@Req() req: Request, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const email = String(req.header('email'));
        const usersRepository = publicConnection.getRepository(Users);
        const list = await usersRepository.find({
            where: { user_type: 1, email: Not(email), is_deleted: false },
        });
        return res.status(200).json({
            data: list,
            message: 'Super admin users list retrived successfully',
        });
    }

    @Put('/edit/:id')
    async edit(
        @Param('id') id: number,
        @Body() user: Users,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        // check user is exist or not
        const userExist = await usersRepository.findOne({ where: { id } });
        if (userExist) {
            if ((await usersRepository.update(id, user)).affected) {
                const updatedUser = await usersRepository.findOne({
                    where: { id: id },
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
                .status(200)
                .json({ message: `${id} User ID does not exist` });
        }
    }

    @Delete('/delete/:id')
    async delete(@Param('id') id: number, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        if ((await usersRepository.update(id, { is_deleted: true })).affected) {
            return res
                .status(200)
                .json({ message: 'User has been deleted successfully' });
        } else {
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }

    @Get('/view/:id')
    async getOne(@Param('id') id: number, @Res() res: Response) {
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const data = await usersRepository.findOne({
            where: { id, user_type: 1 },
        });

        if (!data) {
            return res.status(200).json({ message: 'No data avaialble' });
        }
        return data;
    }
}
