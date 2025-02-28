import {
    Get,
    JsonController,
    QueryParam,
    Req,
    Res,
    UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { Users, Orders } from '../entity/Index';
// import { WallmartOrderController } from "./WallmartOrderController";
import { loggingMiddleware } from '../service/loggingMiddleware';
import { DataSourceConnection } from '../connection';
// import { WallmartClients } from "../modules/WallmartClients";

@JsonController('/orders')
@UseBefore(loggingMiddleware)
export class OrderController extends DataSourceConnection {
    @Get('/old')
    async getOrderOld(
        @QueryParam('page') page: number,
        @QueryParam('limit') limit: number,
    ) {
        const publicConnection = await this.publicConnection();
        const ordersRepository = publicConnection.getRepository(Orders);

        const [orders, total] = await ordersRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            page,
            limit,
            total,
            data: orders,
        };
    }

    @Get('/')
    async getOrder(@Req() req: Request, @Res() res: Response) {
        const email = String(req.header('email'));
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const getUserData = await usersRepository.findOne({
            where: {
                email: email,
            },
        });
        const ordersRepository = (
            await this.connection(getUserData.store_name)
        ).getRepository(Orders);

        const orders = await ordersRepository.find();
        if (orders) {
            return res
                .status(200)
                .send({ data: orders, message: 'Orders found' });
        } else {
            return res.status(404).send({ message: 'Orders does not found' });
        }
    }
}
