import type {Route} from "../types/route.ts";

/**
 * Base Controller class for registering and handling API routes.
 */
export class Controller {
    private readonly name: string;
    private readonly basePath: string;
    private readonly routes: Route[] = [];
    private debug: boolean;

    /**
     * @param name Controller name for logging
     * @param basePath Base path for all routes in this controller
     * @param debug Enable debug logging
     */
    constructor(name: string, basePath: string, debug = false) {
        this.name = name;
        this.basePath = basePath;
        this.debug = debug;
    }

    /**
     * Register a new route for this controller.
     * @param path Route path (relative to basePath)
     * @param method HTTP method (GET, POST, etc.)
     * @param handler Async handler function
     */
    public registerRoute(path: string, method: string, handler: (...args: any[]) => Promise<any>) {
        const fullPath = `/api${this.basePath}${path}`.replace(/\/+/g, '/');
        this.routes.push({
            path: fullPath,
            method: method.toUpperCase(),
            handler,
        });
        if (this.debug) {
            console.log(`[${this.name}] Registered route: ${method.toUpperCase()} ${fullPath}`);
        }
    }

    /**
     * Get all registered routes for this controller.
     */
    public getRoutes(): Route[] {
        return [...this.routes];
    }

    /**
     * Find a handler for a given path and method.
     * @param path Request path
     * @param method HTTP method
     */
    public getHandler(path: string, method: string): ((...args: any[]) => Promise<any>) | null {
        const methodUpper = method.toUpperCase();
        const route = this.routes.find(route =>
            route.path === path && route.method === methodUpper
        );
        if (this.debug) {
            if (route) {
                console.log(`[${this.name}] Found handler: ${route.method} ${route.path}`);
            } else {
                console.log(`[${this.name}] Handler not found for ${methodUpper} ${path}`);
            }
        }
        return route ? route.handler : null;
    }

    /**
     * Get the controller name.
     */
    public getName(): string {
        return this.name;
    }
}