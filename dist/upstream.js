"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get('/todos', (req, res) => {
    res.json([
        { id: 1, task: 'Buy groceries' },
        { id: 2, task: 'Clean the house' },
        { id: 3, task: 'Finish proxy server' }
    ]);
});
const PORT = 800;
app.listen(PORT, () => {
    console.log(`Upstream service running on http://localhost:${PORT}`);
});
