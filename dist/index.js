"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_1 = require("./config");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.option('--config <path>');
        commander_1.program.parse();
        const options = commander_1.program.opts();
        if (options && 'config' in options) {
            const validatedConfig = yield (0, config_1.validateConfig)(yield (0, config_1.parseYAMLConfig)(options.config));
            console.log(validatedConfig);
        }
    });
}
main();
