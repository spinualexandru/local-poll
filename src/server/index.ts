import "./utils/dotenv.ts";
import {PollController} from "./controllers/poll-controller.ts";
import {TestController} from "./controllers/test-controller.ts";
import {Application} from "./utils/application.ts";
import {VoteController} from "./controllers/vote-controller.ts";

console.clear();

const app = Application.getInstance();
app.registerController(new TestController());
app.registerController(new PollController());
app.registerController(new VoteController());
app.serve(); 
