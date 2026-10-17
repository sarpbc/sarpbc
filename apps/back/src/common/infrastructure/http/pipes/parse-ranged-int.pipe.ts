import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseRangedIntPipe implements PipeTransform<string, number> {
  constructor(private readonly options: { min?: number; max?: number }) {}

  transform(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException("Validation failed (numeric string is expected)");
    }
    if (this.options.min !== undefined && parsed < this.options.min) {
      throw new BadRequestException(`Value must be at least ${this.options.min}`);
    }
    if (this.options.max !== undefined && parsed > this.options.max) {
      throw new BadRequestException(`Value must be at most ${this.options.max}`);
    }
    return parsed;
  }
}
