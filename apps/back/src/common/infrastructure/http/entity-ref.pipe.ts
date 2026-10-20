import { Injectable, type PipeTransform } from "@nestjs/common";
import { NotFoundError } from "../../domain/errors";
import { parseEntityRef, type EntityRef } from "../../domain/entity-ref";

@Injectable()
export class EntityRefPipe implements PipeTransform<string, EntityRef> {
  transform(value: string): EntityRef {
    const ref = parseEntityRef(value);
    if (!ref) {
      throw new NotFoundError("This link does not point to an existing page. Check the address.");
    }
    return ref;
  }
}
