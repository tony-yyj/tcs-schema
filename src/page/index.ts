import { mergeWith, apply, Rule, url } from "@angular-devkit/schematics";
import { PageOptions } from "./schema";

export function page(_options: PageOptions): Rule {
    const templateSource = apply(url('./files'), [

    ]);
    return mergeWith(templateSource);
}