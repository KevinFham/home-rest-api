export const mockRequest = (hostname: string = 'localhost', action: string = '') => {
    return {
        query: {
            machineHostname: hostname
        },
        body: {
            action: action
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

