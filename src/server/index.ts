import "./utils/dotenv.ts";
import { AdminController } from "./controllers/admin-controller.ts";
import { BrandingController } from "./controllers/branding-controller.ts";
import {PollController} from "./controllers/poll-controller.ts";
import {TestController} from "./controllers/test-controller.ts";
import {Application} from "./utils/application.ts";
import {VoteController} from "./controllers/vote-controller.ts";

console.clear();

const app = Application.getInstance();
// Branding assets stay reachable while the admin controller gates setup.
app.registerController(new BrandingController());
app.registerController(new AdminController());
app.registerController(new TestController());
app.registerController(new PollController());
app.registerController(new VoteController());
app.serve(); 
