export enum FetchType {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
}

export function jsonFetchWrapper(url: string, fetchType: FetchType, onResult?: (result: any) => void, body?: BodyInit, headers?: any, onError?: (response: any) => void) {
    if (!headers) headers = {};
    headers["Content-Type"] = "application/json";

    let hasError = false;
    let myFetch = fetch(url, {
        method: fetchType,
        headers: headers,
        body: body,
    }).then(response => {
        if (!response.ok) {
            if (onError) onError(response);
            else throw new Error("Error in request at " + url);
            hasError = true;
        }
        else return response.json();
    });

    if (onResult && !hasError) myFetch.then(result => onResult(result));


}

export function textFetchWrapper(url: string, fetchType: FetchType, onResult?: (result: any) => void, body?: BodyInit, headers?: any) {
    if (!headers) headers = {};
    headers["Content-Type"] = "application/json";

    let myFetch: any = fetch(url, {
        method: fetchType,
        headers: headers,
        body: body,
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.text();
        });
    if (onResult) myFetch = myFetch.then((result: any) => onResult(result));
}