export function classes(classes: {[key:string]: boolean}) {
    return Object.entries(classes)
        .filter(([_, active]) => active)
        .map(([klass]) => klass)
        .join(' ');
}
