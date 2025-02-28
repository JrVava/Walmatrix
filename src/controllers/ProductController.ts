import {
    Get,
    JsonController,
    QueryParam,
    Req,
    Res,
    UseBefore,
} from 'routing-controllers';
import { DataSourceConnection } from '../connection';
import { Users, Products } from '../entity/Index';
import { Request, Response } from 'express';
import { loggingMiddleware } from '../service/loggingMiddleware';

@JsonController('/products')
@UseBefore(loggingMiddleware)
export class ProductController extends DataSourceConnection {
    @Get('/old')
    async getProducts_old(
        @QueryParam('page') page: number,
        @QueryParam('limit') limit: number,
        @Req() req: Request,
    ) {
        const email = String(req.header('email'));
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const getUserData = await usersRepository.findOne({
            where: {
                email: email,
            },
        });
        const productsRepository = (
            await this.connection(getUserData.store_name)
        ).getRepository(Products);

        const [products, total] = await productsRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            page,
            limit,
            total,
            data: products,
        };
    }
    @Get('/')
    async getProducts(
        @QueryParam('search') search: string,
        @QueryParam('name') name: string,
        @QueryParam('direction') direction: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        // console.log("search", search);
        // console.log("name", name);
        // console.log("direction", typeof direction);
        // return {}
        const publicConnection = await this.publicConnection();
        const email = String(req.header('email'));
        const usersRepository = publicConnection.getRepository(Users);
        const getUserData = await usersRepository.findOne({
            where: {
                email: email,
            },
        });
        const productsRepository = (
            await this.connection(getUserData.store_name)
        ).getRepository(Products);

        // const product = await productsRepository
        //     .createQueryBuilder('product')
        //     .select('product.*')
        //     .addSelect('cogs.id', 'cogs_id')
        //     .addSelect('cogs.amount', 'cogs_amount')
        //     .addSelect('cogs.start', 'cogs_start_date')
        //     .addSelect('cogs.end', 'cogs_end_date')
        //     .leftJoin('cogs', 'cogs', 'cogs.product_id = product.id')
        //     .getRawMany();
        const queryBuilder = productsRepository
            .createQueryBuilder('product')
            .select('product.*')
            .addSelect('cogs.id', 'cogs_id')
            .addSelect('cogs.amount', 'cogs_amount')
            .addSelect('cogs.start', 'cogs_start_date')
            .addSelect('cogs.end', 'cogs_end_date')
            .leftJoin('cogs', 'cogs', 'cogs.product_id = product.id');
        if (search) {
            queryBuilder.where(
                '(product.product_name LIKE :search OR sku::text LIKE :search OR gtin::text LIKE :search OR item_id::text LIKE :search)',
                { search: `%${search}%` },
            );
        }
        if (name && direction) {
            queryBuilder.orderBy(name, direction as 'ASC' | 'DESC');
        }
        const product = await queryBuilder.getRawMany();
        if (product) {
            publicConnection.destroy();
            (await this.connection(getUserData.store_name)).destroy();
            return res
                .status(200)
                .send({ data: product, message: 'Products found' });
        } else {
            return res.status(404).send({ message: 'Products does not found' });
        }
    }
}
