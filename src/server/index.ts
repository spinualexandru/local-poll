console.clear();
import "./utils/dotenv.ts";
import {TestController} from "./controllers/test-controller.ts";
import {Application} from "./utils/application.ts";

const app = Application.getInstance();
app.registerController(new TestController());
app.serve(); 
