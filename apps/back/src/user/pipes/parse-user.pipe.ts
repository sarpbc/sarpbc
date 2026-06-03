import { PipeTransform, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { UserService } from "../user.service";

@Injectable()
export class ParseUserFromIdPipe implements PipeTransform {
  constructor(private readonly userService: UserService) {}

  async transform(value: string) {
    if (!value) {
      throw new BadRequestException("No user identifier provided");
    }

    const user = await this.userService.findById(value);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}
