export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// users
export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
  }
}

// process
export class ProcessNumberAlreadyExistsError extends AppError {
  constructor() {
    super('Número de processo já cadastrado', 409, 'PROCESS_NUMBER_ALREADY_EXISTS');
  }
}

// lawyers
export class LawyerProfileAlreadyExistsError extends AppError {
  constructor() {
    super('Este usuário já possui perfil de advogado', 409, 'LAWYER_PROFILE_ALREADY_EXISTS');
  }
}

export class OabAlreadyExistsError extends AppError {
  constructor() {
    super('OAB já cadastrada', 409, 'OAB_ALREADY_EXISTS');
  }
}

// costumers
export class CustomerProfileAlreadyExistsError extends AppError {
  constructor() {
    super('Este usuário já possui perfil de cliente', 409, 'CUSTOMER_PROFILE_ALREADY_EXISTS');
  }
}

export class CpfAlreadyExistsError extends AppError {
  constructor() {
    super('CPF já cadastrado', 409, 'CPF_ALREADY_EXISTS');
  }
}