import {Controller} from "../utils/controller.ts";

export class TestController extends Controller {
    constructor() {
        super("TestController", "/data");
        this.registerRoute("/test", "get", this.getData);
    }
    
    public async getData(): Promise<any> {
        return {
            message: "Hello from TestController",
            timestamp: new Date().toISOString(),
        };
    }
}