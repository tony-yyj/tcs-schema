@Component({
    selector: 'hello-<%= dasherize(name) %>',
    template: `
        <h1>book list</h1>
    `
})
export class Hello<%= classify(name) %> Component {
}