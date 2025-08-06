import type {IncomingHttpHeaders, ServerHttp2Stream} from "node:http2";
import type {Route} from "../types/route";

export class Controller {
    private name: string;
    private basePath: string;
    private stream: ServerHttp2Stream;
    private headers: IncomingHttpHeaders;
    private routes: Route = [];

    constructor(name: string, basePath: string) {
        this.name = name;
        this.basePath = basePath;
    }

    public registerRoute(path: string, method: string, handler: (...args: any[]) => Promise<any>) {
        this.routes.push({
            path: `/api${this.basePath}${path}`,
            method,
            handler,
        });
        console.log(`[${this.name}] Registered route: ${method.toUpperCase()} ${this.basePath}${path}`);
    }

    public getRoutes(): Route[] {
        return this.routes;
    }

    public getHandler(path: string, method: string): ((...args: any[]) => Promise<any>) | null {
        console.log(`[${this.name}] Looking for handler for ${method.toUpperCase()} ${path}`);
        path = `${path}`;
        const route = this.routes.find(route => {
                console.log(`[${this.name}] Checking route: ${route.method.toUpperCase()} ${route.path} against ${method.toUpperCase()} ${path}`);
                return route.path === path && route.method.toLowerCase() === method.toLowerCase()
            }
        );
        console.log(this.routes, method)
        console.log(`[${this.name}] Found handler: ${route ? route.method.toUpperCase() : 'NOT FOUND'} ${route ? route.path : ''}`);
        return route ? route.handler : null;
    }
}