export interface PageOptions {
    name: string;
    project?: string;
    path?: string;
    module?: string;
    selector?: string;
    prefix?: string;
    skipTests?: boolean;
    inlineStyle?: boolean;
    inlineTemplate?: boolean;
    flat?: boolean;
    skipImport?: boolean;
    lintFix?: boolean;
    type?: string;
    entryComponent?: string;
    export?: string;
}
