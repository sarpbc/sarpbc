import { Injectable, PipeTransform, BadRequestException } from "@nestjs/common";
import { UserService } from "../user.service";

@Injectable()
export class ParseUserFromEmailPipe implements PipeTransform {
  constructor(private readonly userService: UserService) {}

  async transform(value: any) {
    if (!value || typeof value !== "string") {
      throw new BadRequestException("Invalid email format");
    }

    const user = await this.userService.findOneByEmail(value);

    return user;
  }
}
