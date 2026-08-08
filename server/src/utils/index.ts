// General utility helper functions
export const formatResponse = (status: string, message: string, data?: any) => {
  return {
    status,
    message,
    ...(data && { data }),
  };
};
