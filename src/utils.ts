export function classes(...args: ({ [key: string]: boolean } | string)[]) {
    const classes = [];
    for (const arg of args) {
        if (typeof arg === 'string') {
            classes.push(arg);
        } else {
            for (const [klass, active] of Object.entries(arg)) {
                if (active) classes.push(klass);
            }
        }
    }
    return classes.join(' ');
}
