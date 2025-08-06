export interface Route {
    path: string;
    method: string;
    handler: (...args: any[]) => Promise<any>;
}