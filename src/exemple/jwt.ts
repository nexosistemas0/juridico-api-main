import * as jwt from "jsonwebtoken";
import fs from "fs";

const dados = {name: "victor",email: "victor@gmail.com"}
const jwtPrivateKey = fs.readFileSync("privateKey");


const token = jwt.sign(dados.email, jwtPrivateKey);

console.log(token);