import { Controller } from "../utils/controller.ts";
import type { ServerHttp2Stream } from 'node:http2';

export class TestController extends Controller {
    constructor() {
        super("TestController", "/data", true);
        this.registerRoute("/test", "get", this.getData);
    }

    public async getData(query: any, stream: ServerHttp2Stream, headers: ServerHttp2Stream): Promise<any> {
        return {
            message: "Hello from TestController",
            timestamp: new Date().toISOString(),
        };
    }
}

