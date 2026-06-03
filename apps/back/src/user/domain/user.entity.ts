import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/core";
import { IsEmail } from "class-validator";
import { UserRepository } from "../user.repository";

@Entity({ repository: () => UserRepository })
@Index({ properties: ["email"] })
export class User {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @Property({ type: "boolean", default: "false", hidden: true })
  admin = false;

  @Property()
  @IsEmail()
  email!: string;

  @Property()
  userName!: string;

  @Property({ hidden: true, nullable: true })
  password!: string | null;

  @Property({ nullable: true })
  avatarUrl: string | null;

  @Property({ type: "Date", defaultRaw: "now()" })
  createdAt = new Date();

  @Property({ nullable: true, hidden: true })
  googleId: string | null;

  constructor(
    email: string,
    userName: string,
    passwordhash: string | null = null,
    googleId: string | null = null,
    avatarUrl: string | null = null,
  ) {
    this.email = email;
    this.userName = userName;
    this.password = passwordhash;
    this.googleId = googleId;
    this.avatarUrl = avatarUrl;
  }
}
