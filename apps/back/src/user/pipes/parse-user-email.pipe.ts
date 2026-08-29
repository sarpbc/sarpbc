import { Injectable, PipeTransform, BadRequestException } from "@nestjs/common";
import * as z from "zod";
import { UserService } from "../user.service";
import { User } from "../domain/user.entity";

@Injectable()
export class ParseUserFromEmailPipe implements PipeTransform<string, Promise<User | null>> {
  constructor(private readonly userService: UserService) {}

  async transform(value: string): Promise<User | null> {
    const parsed = z.string().min(1).safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException("Invalid email format");
    }

    return this.userService.findOneByEmail(parsed.data);
  }
}
