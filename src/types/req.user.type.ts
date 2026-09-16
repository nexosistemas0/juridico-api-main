declare global {
  namespace Express {
    interface Request {
      userId: {
        id: any;
      };
    }
  }
}
