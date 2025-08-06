// Route decorator for controller

export function Route(path: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.routes) {
            target.routes = [];
        }
        target.routes.push({
            path,
            method: propertyKey,
            handler: descriptor.value,
        });
    };
}