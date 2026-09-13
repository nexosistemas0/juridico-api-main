import { ValidationError } from "yup";

interface FormattedYupError {
    campo: string,
    message: string
}

export const YupErrors = (error: ValidationError): FormattedYupError[] =>{
    if(error.inner.length > 0){
        return error.inner.map((err) => ({
            campo: err.path ?? "unknown", 
            message: err.message
        }));
    }
    return [
    {
      campo: error.path ?? "unknown",
      message: error.message,
    },
  ];
}