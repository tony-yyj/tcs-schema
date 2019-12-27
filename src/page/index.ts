import {
    mergeWith,
    apply,
    Rule,
    url,
    Tree,
    move,
    filter,
    applyTemplates,
    noop,
    chain,
    SchematicsException
} from "@angular-devkit/schematics";
import {PageOptions} from "./schema";
import {buildDefaultPath, getWorkspace} from "@schematics/angular/utility/workspace";
import {buildRelativePath, findModuleFromOptions} from "@schematics/angular/utility/find-module";
import {parseName} from "@schematics/angular/utility/parse-name";
import {validateHtmlSelector, validateName} from "@schematics/angular/utility/validation";
import {strings} from "@angular-devkit/core";
import {applyLintFix} from "@schematics/angular/utility/lint-fix";
import * as ts from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import {
    addDeclarationToModule,
    addEntryComponentToModule,
    addExportToModule
} from "@schematics/angular/utility/ast-utils";
import {InsertChange} from "@schematics/angular/utility/change";

function buildSelector(options: PageOptions, projectPrefix: string) {
    let selector = strings.dasherize(options.name);
    if (options.prefix) {
        selector = `${options.prefix}-${selector}`;
    } else if (options.prefix === undefined && projectPrefix) {
        selector = `${projectPrefix}-${selector}`;
    }
    return selector;
}

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
    const text = host.read(modulePath);
    if (text === null) {
        throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString('utf-8');

    return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

// @ts-ignore
function addDeclarationToNgModule(options: PageOptions) {
    return (host: Tree) => {
        if (options.skipImport || !options.module) {
            return host;
        }

        options.type = !!options.type ? options.type : 'Component';

        const modulePath = options.module;
        const source = readIntoSourceFile(host, modulePath);

        const componentPath = `/${options.path}/`
            + (options.flat ? '' : strings.dasherize(options.name) + '/')
            + strings.dasherize(options.name)
            + '.'
            + strings.dasherize(options.type);
        const relativePath = buildRelativePath(modulePath, componentPath);
        const classifiedName = strings.classify(options.name) + strings.classify(options.type);
        const declarationChanges = addDeclarationToModule(source,
            modulePath,
            classifiedName,
            relativePath);

        const declarationRecorder = host.beginUpdate(modulePath);
        for (const change of declarationChanges) {
            if (change instanceof InsertChange) {
                declarationRecorder.insertLeft(change.pos, change.toAdd);
            }
        }
        host.commitUpdate(declarationRecorder);

        if (options.export) {
            // Need to refresh the AST because we overwrote the file in the host.
            const source = readIntoSourceFile(host, modulePath);

            const exportRecorder = host.beginUpdate(modulePath);
            const exportChanges = addExportToModule(source, modulePath,
                strings.classify(options.name) + strings.classify(options.type),
                relativePath);

            for (const change of exportChanges) {
                if (change instanceof InsertChange) {
                    exportRecorder.insertLeft(change.pos, change.toAdd);
                }
            }
            host.commitUpdate(exportRecorder);
        }

        if (options.entryComponent) {
            // Need to refresh the AST because we overwrote the file in the host.
            const source = readIntoSourceFile(host, modulePath);

            const entryComponentRecorder = host.beginUpdate(modulePath);
            const entryComponentChanges = addEntryComponentToModule(
                source, modulePath,
                strings.classify(options.name) + strings.classify(options.type),
                relativePath);

            for (const change of entryComponentChanges) {
                if (change instanceof InsertChange) {
                    entryComponentRecorder.insertLeft(change.pos, change.toAdd);
                }
            }
            host.commitUpdate(entryComponentRecorder);
        }


        return host;
    };
}
export function page(_options: PageOptions): Rule {
    return async (host: Tree) => {

        const workspace = await getWorkspace(host);
        const project = workspace.projects.get(_options.project as string);

        // 获得项目的path配置
        if (_options.path === undefined && project) {
            _options.path = buildDefaultPath(project);
        }
        // 获得module
        _options.module = findModuleFromOptions(host, _options);

        // 从name中获取path
        const parsedPath = parseName(_options.path as string, _options.name);
        _options.name = parsedPath.name;
        _options.path = parsedPath.path;
        _options.selector = _options.selector || buildSelector(_options, project && project.prefix || '');

        validateName(_options.name);
        validateHtmlSelector(_options.selector);

        const templateSource = apply(url('./files'), [
            _options.skipTests ? filter(path => !path.endsWith('.spec.ts.template')) : noop(),
            _options.inlineStyle ? filter(path => !path.endsWith('.__style__.template')) : noop(),
            _options.inlineTemplate ? filter(path => !path.endsWith('.html.template')) : noop(),
            applyTemplates({
                ...strings,
                'if-flat': (s: string) => _options.flat ? '' : s,
                ..._options,
            }),
            move(parsedPath.path),
        ]);

        return chain([
            // addDeclarationToNgModule(_options),
            mergeWith(templateSource),
            _options.lintFix ? applyLintFix(_options.path) : noop(),
        ]);
    }
}
