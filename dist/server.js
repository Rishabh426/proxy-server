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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createserver = createserver;
const cluster_1 = __importDefault(require("cluster"));
const node_http_1 = __importDefault(require("node:http"));
function createserver(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { workerCount } = config;
        if (cluster_1.default.isPrimary) {
            console.log("Master process is on");
            for (let i = 0; i < workerCount; i++) {
                cluster_1.default.fork({ config: JSON.stringify(config.config) });
                console.log(`Master process : Worker node spinned up ${i}`);
            }
            const server = node_http_1.default.createServer((req, res) => {
            });
        }
        else {
            console.log(`Worker node`, JSON.stringify(process.env.config));
        }
        const workers = new Array(workerCount);
    });
}
