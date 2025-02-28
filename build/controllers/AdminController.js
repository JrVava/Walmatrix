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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const routing_controllers_1 = require("routing-controllers");
const Index_1 = require("../entity/Index");
const connection_1 = require("../connection");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const typeorm_1 = require("typeorm");
const sendGridMailService_1 = require("../service/sendGridMailService");
const config_1 = require("../config");
const publicService_1 = require("../service/publicService");
let AdminController = class AdminController extends connection_1.DataSourceConnection {
    post(user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            user = Object.assign(Object.assign({}, user), { user_type: 1 }); //flag for supuer admin
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            // Check if user already exists
            const emailExist = yield usersRepository.findOne({
                where: { email: user.email },
            });
            if (emailExist) {
                return res.status(409).json({ message: 'Email already exist' });
            }
            // send welcome mail with credentials
            const mailServiceParams = {
                to: user.email,
                templateId: config_1.config.mailtemplate.welcomemail,
                dynamicTemplateData: {
                    customerName: (0, publicService_1.getFullName)(user.first_name, user.last_name),
                },
            };
            (0, sendGridMailService_1.sendMailTemplate)(mailServiceParams);
            return usersRepository.save(user);
        });
    }
    list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const email = String(req.header('email'));
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const list = yield usersRepository.find({
                where: { user_type: 1, email: (0, typeorm_1.Not)(email), is_deleted: false },
            });
            return res.status(200).json({
                data: list,
                message: 'Super admin users list retrived successfully',
            });
        });
    }
    edit(id, user, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            // check user is exist or not
            const userExist = yield usersRepository.findOne({ where: { id } });
            if (userExist) {
                if ((yield usersRepository.update(id, user)).affected) {
                    const updatedUser = yield usersRepository.findOne({
                        where: { id: id },
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
                    .status(200)
                    .json({ message: `${id} User ID does not exist` });
            }
        });
    }
    delete(id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            if ((yield usersRepository.update(id, { is_deleted: true })).affected) {
                return res
                    .status(200)
                    .json({ message: 'User has been deleted successfully' });
            }
            else {
                return res.status(500).json({ message: 'Something went wrong' });
            }
        });
    }
    getOne(id, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const data = yield usersRepository.findOne({
                where: { id, user_type: 1 },
            });
            if (!data) {
                return res.status(200).json({ message: 'No data avaialble' });
            }
            return data;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)('/create'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "post", null);
__decorate([
    (0, routing_controllers_1.Get)('/list'),
    __param(0, (0, routing_controllers_1.Req)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "list", null);
__decorate([
    (0, routing_controllers_1.Put)('/edit/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Body)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Index_1.Users, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "edit", null);
__decorate([
    (0, routing_controllers_1.Delete)('/delete/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "delete", null);
__decorate([
    (0, routing_controllers_1.Get)('/view/:id'),
    __param(0, (0, routing_controllers_1.Param)('id')),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOne", null);
AdminController = __decorate([
    (0, routing_controllers_1.JsonController)('/admin'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], AdminController);
exports.AdminController = AdminController;
//# sourceMappingURL=AdminController.js.map