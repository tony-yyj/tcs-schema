import { Rule, Tree, SchematicContext, SchematicsException, url, apply,  template, move, mergeWith} from '@angular-devkit/schematics';
import { schemaOptions } from './schema';

export function tcsSchema(_options: schemaOptions): Rule {

    return (tree: Tree, _context: SchematicContext) => {
        const workspaceConfigBuffer = tree.read('angular.json');
        if (!workspaceConfigBuffer) {
            throw new SchematicsException("Not an Angular Cli workspace");
        }

        const workspaceConfig = JSON.parse(workspaceConfigBuffer.toString());
        const projectName = _options.project || workspaceConfig.defaultProject;
        const project = workspaceConfig.projects[projectName];
        const defaultProjectPath = buildDefaultPath(project);
        const parsePath = parseName(defaultProjectPath, _options.name);
        const {name, path} = parsePath;
        const sourceTemplate = url('./files');
        const sourceParametrizedTemplate = apply(sourceTemplate, [
            template({
                ..._options,
                ...strings,
                name,
            }),
            move(path)
        ]);
        return mergeWith(sourceParametrizedTemplate)(tree, _context);
    };

}
