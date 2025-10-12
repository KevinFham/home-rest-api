export const mockRequest = (req: { query?: {}, action?: string }) => {
    return {
        query: req.query,
        body: {
            action: req.action
        }
    };
};

export const mockResponse = () => {
    const res = {
        status(status) { res._status = status; return res; },
        json(data) { res._json = data; return res; },
        send(data) { res._send = data; return res; }
    }
    return res;
};

