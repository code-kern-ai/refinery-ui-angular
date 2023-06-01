export function downloadBlob(byteData: any, filename = 'file.zip', type = 'application/octet-stream') {
    const blob = new Blob([JSON.stringify(byteData)], {
        type: type
    })
    const blobUrl = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.dispatchEvent(
        new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        })
    );

    document.body.removeChild(link);
}