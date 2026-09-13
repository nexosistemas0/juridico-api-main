// import {pool} from "../config/database.js";
import * as bcrypt from "bcrypt";
let cadastro = "22349520938450";
let login = cadastro;

const salt = await bcrypt.genSalt(10)

let hash = await bcrypt.hash(cadastro, salt);
let compare = await bcrypt.compare(login, hash);

let validateAcess = () => {if(compare != true){return "Access denied"}else{return "Access granted"}};

console.log(`\nYour password: ${cadastro},\nsalt: ${salt},\nhash: ${hash},\nlogin: ${validateAcess()}
`);