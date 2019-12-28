import * as Web from "./web.export";

for(var key in Web)
    (window as any)[key] = (Web as any)[key];