import jwt from "jsonwebtoken";


function val(){
    const payload = {email: "victoreduardomartins2@gmail.com"};
    const key = "1234";
    
    const sing = jwt.sign(payload, key);

   try {
    const auth = jwt.verify(sing, key);
    return auth;
   } catch(err){
        return "não encontrado";  
   }

}
 console.log(val());